//
//  ViewController.h
//  MonkeyPinch
//
//  Created by Ray Wenderlich on 11/29/11.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <AVFoundation/AVFoundation.h>
#import "TickleGestureRecognizer.h"

@interface ViewController : UIViewController <UIGestureRecognizerDelegate>

- (IBAction)handlePan:(UIPanGestureRecognizer *)recognizer;
- (IBAction)handlePinch:(UIPinchGestureRecognizer *)recognizer;
- (IBAction)handleRotate:(UIRotationGestureRecognizer *)recognizer;

@property (strong) AVAudioPlayer * chompPlayer;
- (void)handleTap:(UITapGestureRecognizer *)recognizer;

@property (strong, nonatomic) IBOutlet UIPanGestureRecognizer *monkeyPan;
@property (strong, nonatomic) IBOutlet UIPanGestureRecognizer *bananaPan;

@property (strong) AVAudioPlayer * hehePlayer;
- (void)handleTickle:(TickleGestureRecognizer *)recognizer;

@end
