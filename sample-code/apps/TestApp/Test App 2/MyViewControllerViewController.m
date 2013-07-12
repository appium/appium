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

#import "MyViewControllerViewController.h"

@interface MyViewControllerViewController ()

@end

@implementation MyViewControllerViewController
@synthesize computeSumButton;
@synthesize answerLabel;
@synthesize firstArg;
@synthesize secondArg;

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
    }
	[firstArg setAccessibilityIdentifier:@"IntegerA"];
	[secondArg setAccessibilityIdentifier:@"IntegerB"];
	[computeSumButton setAccessibilityIdentifier:@"ComputeSumButton"];
	[answerLabel setAccessibilityIdentifier:@"Answer"];
    return self;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view from its nib.
    firstArg.returnKeyType = UIReturnKeyDone;
    secondArg.returnKeyType = UIReturnKeyDone;
    firstArg.delegate = self;
    secondArg.delegate = self;
}

- (void)viewDidUnload
{
    [self setFirstArg:nil];
    [self setSecondArg:nil];
    [self setAnswerLabel:nil];
    [super viewDidUnload];
    // Release any retained subviews of the main view.
    // e.g. self.myOutlet = nil;
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
    [textField resignFirstResponder];
    return YES;
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation
{
    return (interfaceOrientation == UIInterfaceOrientationPortrait);
}

- (void)dealloc {
    [firstArg release];
    [secondArg release];
    [answerLabel release];
	[computeSumButton release];
    [super dealloc];
}
- (IBAction)testGesture:(id)sender
{
    GestureTestViewController *test = [[GestureTestViewController alloc]  initWithNibName:@"GestureTestViewController" bundle:nil];
    [self presentViewController:test animated:YES completion:NULL];
}

- (IBAction)computeAction:(id)sender {
	int a = [[firstArg text] intValue];
	int b = [[secondArg text] intValue];
	int sum = a + b;
	NSString *newLabelValue = [NSString stringWithFormat:@"%d",sum];
	[answerLabel setText:newLabelValue];
	[answerLabel setAccessibilityLabel:newLabelValue];
}

- (IBAction)showAlert:(id)sender {
    UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Cool title"
                                                    message:@"this alert is so cool."
                                                   delegate:nil
                                          cancelButtonTitle:@"Cancel"
                                          otherButtonTitles:@"OK", nil];
    [alert show];
    [alert release];
}
@end
