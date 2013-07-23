//
//  TickleGestureRecognizer.m
//  MonkeyPinch
//
//  Created by Ray Wenderlich on 11/29/11.
//  Copyright (c) 2011 __MyCompanyName__. All rights reserved.
//

#import "TickleGestureRecognizer.h"
#import <UIKit/UIGestureRecognizerSubclass.h>

#define REQUIRED_TICKLES        2
#define MOVE_AMT_PER_TICKLE     25

@implementation TickleGestureRecognizer
@synthesize tickleCount;
@synthesize curTickleStart;
@synthesize lastDirection;

- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event {    
    UITouch * touch = [touches anyObject];
    self.curTickleStart = [touch locationInView:self.view];
}

- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event {
    
    // Make sure we've moved a minimum amount since curTickleStart
    UITouch * touch = [touches anyObject];
    CGPoint ticklePoint = [touch locationInView:self.view];
    CGFloat moveAmt = ticklePoint.x - curTickleStart.x;
    Direction curDirection;
    if (moveAmt < 0) {
        curDirection = DirectionLeft;
    } else {
        curDirection = DirectionRight;
    }
    if (ABS(moveAmt) < MOVE_AMT_PER_TICKLE) return;
    
    // Make sure we've switched directions
    if (self.lastDirection == DirectionUnknown ||
        (self.lastDirection == DirectionLeft && curDirection == DirectionRight) ||
        (self.lastDirection == DirectionRight && curDirection == DirectionLeft)) {
        
        // w00t we've got a tickle!
        self.tickleCount++;
        self.curTickleStart = ticklePoint;
        self.lastDirection = curDirection;     
        
        // Once we have the required number of tickles, switch the state to ended.
        // As a result of doing this, the callback will be called.
        if (self.state == UIGestureRecognizerStatePossible && self.tickleCount > REQUIRED_TICKLES) {
            [self setState:UIGestureRecognizerStateEnded];
        }
    }
    
}

- (void)reset {
    self.tickleCount = 0;
    self.curTickleStart = CGPointZero;
    self.lastDirection = DirectionUnknown;
    if (self.state == UIGestureRecognizerStatePossible) {
        [self setState:UIGestureRecognizerStateFailed]; 
    }
}

- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event
{
    [self reset];
}

- (void)touchesCancelled:(NSSet *)touches withEvent:(UIEvent *)event
{
    [self reset];
}

@end
