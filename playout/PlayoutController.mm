#import "PlayoutController.h"
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>
#import <QuartzCore/QuartzCore.h>
#import <math.h>

#import "../apisel/DeckLinkAPI.h"
#import "../apisel/DeckLinkAPIVideoFrame_v14_2_1.h"

@interface DeviceEntryObj : NSObject
@property (nonatomic, assign) IDeckLink* decklink;
@property (nonatomic, strong) NSString* name;
@end

@implementation DeviceEntryObj
@end

@interface PlayoutController() <NSTableViewDataSource, NSTableViewDelegate>
{
    NSMutableArray<DeviceEntryObj*>* devices;
    IDeckLinkOutput* decklinkOutput;
    IDeckLinkVideoConversion* videoConverter;
    AVSampleBufferDisplayLayer* previewLayer;
    NSMutableArray<NSURL*>* playlist;
    NSInteger currentIndex;
    BOOL isPlaying;
    BOOL loopEnabled;
    dispatch_queue_t playoutQueue;
    AVAssetReader* reader;
    AVAssetReaderTrackOutput* videoOutput;
    AVAssetReaderAudioMixOutput* audioOutput;
    int64_t videoTimeScale;
    int width;
    int height;
    double fps;
}
@end

@implementation PlayoutController

- (void)setup
{
    devices = [NSMutableArray array];
    playlist = [NSMutableArray array];
    currentIndex = -1;
    playoutQueue = dispatch_queue_create("playout.queue", DISPATCH_QUEUE_SERIAL);
    previewLayer = [AVSampleBufferDisplayLayer new];
    previewLayer.videoGravity = AVLayerVideoGravityResizeAspect;
    self.previewView.wantsLayer = YES;
    [self.previewView.layer addSublayer:previewLayer];
    previewLayer.frame = self.previewView.bounds;

    [self.deviceSelector removeAllItems];

    IDeckLinkIterator* it = CreateDeckLinkIteratorInstance();
    if (it) {
        IDeckLink* dev = nullptr;
        while (it->Next(&dev) == S_OK && dev) {
            CFStringRef nameRef = NULL;
            dev->GetDisplayName(&nameRef);
            NSString* name = (__bridge_transfer NSString*)nameRef;
            DeviceEntryObj* entry = [DeviceEntryObj new];
            entry.decklink = dev;
            entry.name = name;
            [devices addObject:entry];
            [self.deviceSelector addItemWithTitle:name ?: @"DeckLink"];
        }
        it->Release();
    }

    if (devices.count > 0) {
        [self selectDeviceAtIndex:0];
    }

    self.playlistView.dataSource = self;
    self.playlistView.delegate = self;
}

- (void)dealloc
{
    [self stop];
    for (DeviceEntryObj* e in devices) {
        if (e.decklink) e.decklink->Release();
    }
}

- (void)selectDeviceAtIndex:(NSInteger)index
{
    if (index < 0 || index >= devices.count) return;
    DeviceEntryObj* entry = devices[index];
    if (decklinkOutput) { decklinkOutput->Release(); decklinkOutput = nullptr; }
    if (videoConverter) { videoConverter->Release(); videoConverter = nullptr; }

    IDeckLink* dev = entry.decklink;
    IDeckLinkOutput* out = nullptr;
    if (dev->QueryInterface(IID_IDeckLinkOutput, (void**)&out) == S_OK) {
        decklinkOutput = out;
        videoConverter = CreateVideoConversionInstance();
    }
}

- (void)addFilesToQueue:(NSArray<NSURL*>*)urls
{
    for (NSURL* u in urls) {
        [playlist addObject:u];
    }
    [self.playlistView reloadData];
}

- (void)setLoopEnabled:(BOOL)enabled
{
    loopEnabled = enabled;
}

- (void)play
{
    if (isPlaying) return;
    if (playlist.count == 0) return;
    if (currentIndex < 0) currentIndex = 0;
    [self startItemAtIndex:currentIndex];
}

- (void)pause
{
    if (!isPlaying) return;
    if (!decklinkOutput) return;
    decklinkOutput->StopScheduledPlayback(0, NULL, 0);
}

- (void)stop
{
    if (!decklinkOutput) return;
    decklinkOutput->StopScheduledPlayback(0, NULL, 0);
    decklinkOutput->DisableVideoOutput();
    decklinkOutput->DisableAudioOutput();
    isPlaying = NO;
    [previewLayer flushAndRemoveImage];
}

- (void)startItemAtIndex:(NSInteger)index
{
    if (!decklinkOutput) return;
    NSURL* url = playlist[index];
    AVAsset* asset = [AVURLAsset URLAssetWithURL:url options:nil];
    NSError* err = nil;
    reader = [[AVAssetReader alloc] initWithAsset:asset error:&err];
    if (!reader || err) return;

    AVAssetTrack* vTrack = [asset tracksWithMediaType:AVMediaTypeVideo].firstObject;
    AVAssetTrack* aTrack = [asset tracksWithMediaType:AVMediaTypeAudio].firstObject;
    if (!vTrack) return;

    NSDictionary* vSettings = @{(__bridge NSString*)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA)};
    videoOutput = [[AVAssetReaderTrackOutput alloc] initWithTrack:vTrack outputSettings:vSettings];
    [reader addOutput:videoOutput];

    NSDictionary* aSettings = @{AVFormatIDKey: @(kAudioFormatLinearPCM), AVSampleRateKey: @48000, AVNumberOfChannelsKey: @2, AVLinearPCMBitDepthKey: @16, AVLinearPCMIsFloatKey: @NO, AVLinearPCMIsNonInterleaved: @NO};
    AVAssetReaderTrackOutput* aOut = nil;
    if (aTrack) {
        aOut = [[AVAssetReaderTrackOutput alloc] initWithTrack:aTrack outputSettings:aSettings];
        [reader addOutput:aOut];
    }

    [reader startReading];

    width = (int)vTrack.naturalSize.width;
    height = (int)vTrack.naturalSize.height;
    fps = vTrack.nominalFrameRate;
    videoTimeScale = vTrack.minFrameDuration.timescale ?: 1000;
    self.infoLabel.stringValue = [NSString stringWithFormat:@"%dx%d @ %.2f fps", width, height, fps];

    IDeckLinkDisplayModeIterator* modeIt = nullptr;
    decklinkOutput->GetDisplayModeIterator(&modeIt);
    IDeckLinkDisplayMode* match = nullptr;
    if (modeIt) {
        IDeckLinkDisplayMode* m = nullptr;
        while (modeIt->Next(&m) == S_OK && m) {
            if ((int)m->GetWidth() == width && (int)m->GetHeight() == height) {
                BMDTimeValue frameDuration = 0;
                BMDTimeScale frameScale = 0;
                m->GetFrameRate(&frameDuration, &frameScale);
                double modeFps = (double)frameScale / (double)frameDuration;
                if (fabs(modeFps - fps) < 0.5) { match = m; break; }
                m->Release();
            } else {
                m->Release();
            }
        }
        modeIt->Release();
    }
    if (!match) return;

    decklinkOutput->EnableVideoOutput(match->GetDisplayMode(), bmdVideoOutputFlagDefault);
    decklinkOutput->EnableAudioOutput(bmdAudioSampleRate48kHz, bmdAudioSampleType16bitInteger, 8, bmdAudioOutputStreamContinuous);
    match->Release();

    isPlaying = YES;

    __weak PlayoutController* weakSelf = self;
    dispatch_async(playoutQueue, ^{ [weakSelf scheduleFromReader]; });
}

- (void)scheduleFromReader
{
    CMTime t0 = kCMTimeZero;
    BOOL started = NO;
    decklinkOutput->StartScheduledPlayback(0, 1.0, videoTimeScale);
    while (reader.status == AVAssetReaderStatusReading) {
        CMSampleBufferRef vBuf = [videoOutput copyNextSampleBuffer];
        CMSampleBufferRef aBuf = NULL;
        for (AVAssetReaderOutput* out in reader.outputs) {
            if (out != videoOutput) {
                aBuf = [(AVAssetReaderTrackOutput*)out copyNextSampleBuffer];
                break;
            }
        }
        if (!vBuf) break;

        CVImageBufferRef img = CMSampleBufferGetImageBuffer(vBuf);
        CFRetain(img);

        [previewLayer enqueueSampleBuffer:vBuf];

        CMTime pts = CMSampleBufferGetPresentationTimeStamp(vBuf);
        if (!started) { t0 = pts; started = YES; }
        BMDTimeScale ts = (BMDTimeScale)videoTimeScale;
        BMDTimeValue dt = (BMDTimeValue)((pts.value - t0.value));

        IDeckLinkMutableVideoFrame* yuvFrame = nullptr;
        decklinkOutput->CreateVideoFrame(width, height, width * 2, bmdFormat8BitYUV, bmdFrameFlagDefault, &yuvFrame);

        IDeckLinkMutableVideoFrame* bgraFrame = nullptr;
        decklinkOutput->CreateVideoFrame(width, height, width * 4, bmdFormat8BitBGRA, bmdFrameFlagDefault, &bgraFrame);

        void* dst = NULL;
        IDeckLinkVideoFrame_v14_2_1* v14 = nullptr;
        bgraFrame->QueryInterface(IID_IDeckLinkVideoFrame_v14_2_1, (void**)&v14);
        if (v14) { v14->GetBytes(&dst); v14->Release(); }
        CVPixelBufferLockBaseAddress(img, kCVPixelBufferLock_ReadOnly);
        void* src = CVPixelBufferGetBaseAddress(img);
        size_t bytesPerRow = CVPixelBufferGetBytesPerRow(img);
        for (int r = 0; r < height; ++r) {
            memcpy((uint8_t*)dst + r * width * 4, (uint8_t*)src + r * bytesPerRow, width * 4);
        }
        CVPixelBufferUnlockBaseAddress(img, kCVPixelBufferLock_ReadOnly);
        CFRelease(img);

        if (videoConverter) videoConverter->ConvertFrame(bgraFrame, yuvFrame);
        decklinkOutput->ScheduleVideoFrame(yuvFrame, dt, matchDuration(ts, fps), ts);

        if (bgraFrame) bgraFrame->Release();
        if (yuvFrame) yuvFrame->Release();

        if (aBuf) {
            CMBlockBufferRef bb = CMSampleBufferGetDataBuffer(aBuf);
            size_t len = 0; char* data = NULL;
            CMBlockBufferGetDataPointer(bb, 0, NULL, &len, &data);
            int total = (int)(len / 4);
            int16_t* interleaved = (int16_t*)data;
            int16_t* mono = (int16_t*)malloc(total * sizeof(int16_t));
            for (int i = 0; i < total; ++i) {
                int32_t l = interleaved[i * 2 + 0];
                int32_t r = interleaved[i * 2 + 1];
                int16_t m = (int16_t)((l + r) / 2);
                mono[i] = m;
            }
            int16_t* eight = (int16_t*)malloc(total * 8 * sizeof(int16_t));
            for (int i = 0; i < total; ++i) {
                for (int ch = 0; ch < 8; ++ch) eight[i * 8 + ch] = mono[i];
            }
            uint32_t sc = 0;
            decklinkOutput->ScheduleAudioSamples(eight, total, dt, ts, &sc);
            free(mono);
            free(eight);
            CFRelease(aBuf);
        }

        CFRelease(vBuf);
    }

    if (reader.status == AVAssetReaderStatusCompleted) {
        if (loopEnabled) {
            currentIndex = (currentIndex + 1) % playlist.count;
            [self startItemAtIndex:currentIndex];
        } else {
            [self stop];
        }
    }
}

static BMDTimeValue matchDuration(BMDTimeScale ts, double fps)
{
    double frameDur = ts / fps;
    return (BMDTimeValue)llround(frameDur);
}

- (NSInteger)numberOfRowsInTableView:(NSTableView *)tableView { return playlist.count; }
- (NSView *)tableView:(NSTableView *)tableView viewForTableColumn:(NSTableColumn *)tableColumn row:(NSInteger)row
{
    NSTextField* tf = [NSTextField labelWithString:playlist[row].lastPathComponent];
    return tf;
}

@end