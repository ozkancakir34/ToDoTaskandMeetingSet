#import <Cocoa/Cocoa.h>
#import <AVFoundation/AVFoundation.h>

@interface PlayoutController : NSObject

@property (nonatomic, strong) NSView* previewView;
@property (nonatomic, strong) NSPopUpButton* deviceSelector;
@property (nonatomic, strong) NSTableView* playlistView;
@property (nonatomic, strong) NSTextField* infoLabel;
@property (nonatomic, strong) NSButton* loopButton;

- (void)setup;
- (void)addFilesToQueue:(NSArray<NSURL*>*)urls;
- (void)play;
- (void)pause;
- (void)stop;
- (void)setLoopEnabled:(BOOL)enabled;
- (void)selectDeviceAtIndex:(NSInteger)index;

@end