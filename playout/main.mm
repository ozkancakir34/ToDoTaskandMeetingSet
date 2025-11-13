#import <Cocoa/Cocoa.h>
#import "PlayoutController.h"

@interface AppDelegate : NSObject <NSApplicationDelegate>
@property (strong) NSWindow* window;
@property (strong) PlayoutController* controller;
@end

@implementation AppDelegate
- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
    NSRect frame = NSMakeRect(100, 100, 900, 600);
    self.window = [[NSWindow alloc] initWithContentRect:frame styleMask:(NSWindowStyleMaskTitled|NSWindowStyleMaskClosable|NSWindowStyleMaskResizable) backing:NSBackingStoreBuffered defer:NO];
    [self.window setTitle:@"Video Playout"];

    NSView* content = self.window.contentView;

    NSView* preview = [[NSView alloc] initWithFrame:NSMakeRect(20, 20, 320, 180)];
    [content addSubview:preview];

    NSTextField* info = [NSTextField labelWithString:@"-"]; info.frame = NSMakeRect(20, 205, 320, 20); [content addSubview:info];

    NSPopUpButton* deviceSel = [[NSPopUpButton alloc] initWithFrame:NSMakeRect(360, 20, 200, 26) pullsDown:NO];
    [content addSubview:deviceSel];

    NSButton* queueBtn = [[NSButton alloc] initWithFrame:NSMakeRect(360, 60, 80, 30)]; queueBtn.title = @"QUE"; queueBtn.bezelStyle = NSBezelStyleRounded; [content addSubview:queueBtn];
    NSButton* playBtn = [[NSButton alloc] initWithFrame:NSMakeRect(450, 60, 80, 30)]; playBtn.title = @"PLAY"; playBtn.bezelStyle = NSBezelStyleRounded; [content addSubview:playBtn];
    NSButton* pauseBtn = [[NSButton alloc] initWithFrame:NSMakeRect(540, 60, 80, 30)]; pauseBtn.title = @"PAUSE"; pauseBtn.bezelStyle = NSBezelStyleRounded; [content addSubview:pauseBtn];
    NSButton* stopBtn = [[NSButton alloc] initWithFrame:NSMakeRect(630, 60, 80, 30)]; stopBtn.title = @"STOP"; stopBtn.bezelStyle = NSBezelStyleRounded; [content addSubview:stopBtn];

    NSButton* loopBtn = [[NSButton alloc] initWithFrame:NSMakeRect(360, 100, 100, 24)]; loopBtn.title = @"Loop"; loopBtn.buttonType = NSButtonTypeSwitch; [content addSubview:loopBtn];

    NSScrollView* scroll = [[NSScrollView alloc] initWithFrame:NSMakeRect(360, 140, 500, 400)];
    NSTableView* table = [[NSTableView alloc] initWithFrame:scroll.bounds];
    NSTableColumn* col = [[NSTableColumn alloc] initWithIdentifier:@"col"]; col.title = @"Playlist"; col.width = 480; [table addTableColumn:col];
    scroll.documentView = table; scroll.hasVerticalScroller = YES; [content addSubview:scroll];

    self.controller = [PlayoutController new];
    self.controller.previewView = preview;
    self.controller.deviceSelector = deviceSel;
    self.controller.playlistView = table;
    self.controller.infoLabel = info;
    self.controller.loopButton = loopBtn;
    [self.controller setup];

    deviceSel.target = self; deviceSel.action = @selector(onDeviceSel:);
    queueBtn.target = self; queueBtn.action = @selector(onQueue:);
    playBtn.target = self; playBtn.action = @selector(onPlay:);
    pauseBtn.target = self; pauseBtn.action = @selector(onPause:);
    stopBtn.target = self; stopBtn.action = @selector(onStop:);
    loopBtn.target = self; loopBtn.action = @selector(onLoop:);

    [self.window makeKeyAndOrderFront:nil];
}

- (void)onDeviceSel:(id)sender
{ [self.controller selectDeviceAtIndex:self.controller.deviceSelector.indexOfSelectedItem]; }
- (void)onQueue:(id)sender
{
    NSOpenPanel* op = [NSOpenPanel openPanel];
    op.allowsMultipleSelection = YES;
    op.allowedFileTypes = @[@"mov", @"mxf", @"mp4"]; 
    if ([op runModal] == NSModalResponseOK) {
        [self.controller addFilesToQueue:op.URLs];
    }
}
- (void)onPlay:(id)sender { [self.controller play]; }
- (void)onPause:(id)sender { [self.controller pause]; }
- (void)onStop:(id)sender { [self.controller stop]; }
- (void)onLoop:(id)sender { [self.controller setLoopEnabled:(self.controller.loopButton.state == NSControlStateValueOn)]; }

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication* app = [NSApplication sharedApplication];
        AppDelegate* delegate = [AppDelegate new];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}