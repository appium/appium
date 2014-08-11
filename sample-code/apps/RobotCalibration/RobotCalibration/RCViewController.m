/**
 *	Copyright 2012 Appium Committers
 *
 *	Licensed to the Apache Software Foundation (ASF) under one
 *	or more contributor license agreements.  See the NOTICE file
 *	distributed with this work for additional information
 *	regarding copyright ownership.  The ASF licenses this file
 *	to you under the Apache License, Version 2.0 (the
 *	"License"); you may not use this file except in compliance
 *	with the License.  You may obtain a copy of the License at
 *
 *	http://www.apache.org/licenses/LICENSE-2.0
 *
 *	Unless required by applicable law or agreed to in writing,
 *	software distributed under the License is distributed on an
 *	"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *	KIND, either express or implied.  See the License for the
 *	specific language governing permissions and limitations
 *	under the License.
 */

#import "RCViewController.h"

@interface RCViewController ()

@end

@implementation RCViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view, typically from a nib.
	[self becomeFirstResponder];
	
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (NSUInteger)supportedInterfaceOrientations
{
    return UIInterfaceOrientationMaskAllButUpsideDown;
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)orientation
{
	if ((orientation == UIInterfaceOrientationPortrait) ||
		(orientation == UIInterfaceOrientationLandscapeLeft) ||
		(orientation == UIInterfaceOrientationLandscapeRight))
		return YES;
	
	return NO;
}

- (void)didRotateFromInterfaceOrientation:(UIInterfaceOrientation)fromInterfaceOrientation {
	[self.view setNeedsLayout];
	[self.view setNeedsDisplay];
}


- (void)touchesBegan:(NSSet *)touches withEvent:(UIEvent *)event {
	//UITouch *touch = [touches anyObject];
	for (UIView *view in self.view.subviews) {
		[view removeFromSuperview];
	}
	for (UITouch *touch in [[event allTouches] allObjects]) {
		[self displayCoordinatesForTouch:touch];
	}
}

- (void)touchesMoved:(NSSet *)touches withEvent:(UIEvent *)event {
	//UITouch *touch = [touches anyObject];
	for (UIView *view in self.view.subviews) {
		[view removeFromSuperview];
	}
	for (UITouch *touch in [[event allTouches] allObjects]) {
		[self displayCoordinatesForTouch:touch];
	}

}

- (void)touchesEnded:(NSSet *)touches withEvent:(UIEvent *)event {
	for (UIView *view in self.view.subviews) {
		[view removeFromSuperview];
	}
}

- (void)displayCoordinatesForTouch:(UITouch *)touch {
	CGPoint locationInView = [touch locationInView:self.view];
	int viewWidth = self.view.frame.size.width;
	int viewHeight = self.view.frame.size.height;
	
	if (([[UIApplication sharedApplication] statusBarOrientation] == UIInterfaceOrientationLandscapeLeft) ||
		([[UIApplication sharedApplication] statusBarOrientation] == UIInterfaceOrientationLandscapeRight)) {
		viewWidth = self.view.frame.size.height;
		viewHeight = self.view.frame.size.width;
	}
	// Calculate the Coordinate Label Frame
	CGRect coordinateLabelFrame = CGRectMake(0, 0, 0, 0);
	coordinateLabelFrame.size.height = 20;
	coordinateLabelFrame.size.width = 100;
	// We want the label to stay 40pts from the edges
	coordinateLabelFrame.origin.x = MIN(MAX(locationInView.x - 40, 40), viewWidth - coordinateLabelFrame.size.width - 40);
	coordinateLabelFrame.origin.y = MIN(MAX(locationInView.y - 30, 40), viewHeight - coordinateLabelFrame.size.height - 40);
	
	// Set the frame and test of the label
	UILabel *coordinateLabel = [[UILabel alloc] initWithFrame:coordinateLabelFrame];
	coordinateLabel.text = [NSString stringWithFormat:@"(%d, %d)", (int)locationInView.x, (int)locationInView.y];
	coordinateLabel.font = [UIFont fontWithName:@"Helvetica-Bold" size:18.0f];
	[self.view addSubview:coordinateLabel];
}

@end
