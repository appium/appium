/*
     File: PickerViewController.m 
 Abstract: The view controller for hosting the UIPickerView of this sample. 
  Version: 2.11 
  
 Disclaimer: IMPORTANT:  This Apple software is supplied to you by Apple 
 Inc. ("Apple") in consideration of your agreement to the following 
 terms, and your use, installation, modification or redistribution of 
 this Apple software constitutes acceptance of these terms.  If you do 
 not agree with these terms, please do not use, install, modify or 
 redistribute this Apple software. 
  
 In consideration of your agreement to abide by the following terms, and 
 subject to these terms, Apple grants you a personal, non-exclusive 
 license, under Apple's copyrights in this original Apple software (the 
 "Apple Software"), to use, reproduce, modify and redistribute the Apple 
 Software, with or without modifications, in source and/or binary forms; 
 provided that if you redistribute the Apple Software in its entirety and 
 without modifications, you must retain this notice and the following 
 text and disclaimers in all such redistributions of the Apple Software. 
 Neither the name, trademarks, service marks or logos of Apple Inc. may 
 be used to endorse or promote products derived from the Apple Software 
 without specific prior written permission from Apple.  Except as 
 expressly stated in this notice, no other rights or licenses, express or 
 implied, are granted by Apple herein, including but not limited to any 
 patent rights that may be infringed by your derivative works or by other 
 works in which the Apple Software may be incorporated. 
  
 The Apple Software is provided by Apple on an "AS IS" basis.  APPLE 
 MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION 
 THE IMPLIED WARRANTIES OF NON-INFRINGEMENT, MERCHANTABILITY AND FITNESS 
 FOR A PARTICULAR PURPOSE, REGARDING THE APPLE SOFTWARE OR ITS USE AND 
 OPERATION ALONE OR IN COMBINATION WITH YOUR PRODUCTS. 
  
 IN NO EVENT SHALL APPLE BE LIABLE FOR ANY SPECIAL, INDIRECT, INCIDENTAL 
 OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 INTERRUPTION) ARISING IN ANY WAY OUT OF THE USE, REPRODUCTION, 
 MODIFICATION AND/OR DISTRIBUTION OF THE APPLE SOFTWARE, HOWEVER CAUSED 
 AND WHETHER UNDER THEORY OF CONTRACT, TORT (INCLUDING NEGLIGENCE), 
 STRICT LIABILITY OR OTHERWISE, EVEN IF APPLE HAS BEEN ADVISED OF THE 
 POSSIBILITY OF SUCH DAMAGE. 
  
 Copyright (C) 2013 Apple Inc. All Rights Reserved. 
  
 */

#import "PickerViewController.h"
#import "CustomView.h"
#import "Constants.h"

@interface PickerViewController () <UIPickerViewDelegate, UIPickerViewDataSource>

@property (nonatomic, weak) IBOutlet UIScrollView *scrollView;

@property (nonatomic, strong) UIPickerView *myPickerView;
@property (nonatomic, strong) UIDatePicker *datePickerView;
@property (nonatomic, strong) NSArray *pickerViewArray;

@property (nonatomic, strong) UILabel *label;

@property (nonatomic, strong) UIPickerView *customPickerView;
@property (nonatomic, strong) CustomPickerDataSource *customPickerDataSource;

@property (nonatomic, strong) UIView *currentPicker;

@property (nonatomic, weak) IBOutlet UISegmentedControl *buttonBarSegmentedControl;
@property (nonatomic, weak) IBOutlet UISegmentedControl *pickerStyleSegmentedControl;
@property (nonatomic, weak) IBOutlet UILabel *segmentLabel;
@property (nonatomic, weak) IBOutlet UIToolbar *toolbar;

@end

const CGFloat kOptimumPickerHeight = 216;
const CGFloat kOptimumPickerWidth = 320;

#pragma mark -

@implementation PickerViewController

// return the picker frame based on its size, positioned at the bottom of the page relative to the toolbar
- (CGRect)pickerFrameWithSize:(CGSize)size
{
    CGRect resultFrame;
    
    CGFloat height = size.height;
    CGFloat width = size.width;
        
    if (size.height < kOptimumPickerHeight)
        // if in landscape, the picker height can be sized too small, so use a optimum height
        height = kOptimumPickerHeight;
    
    if (size.width > kOptimumPickerWidth)
        // keep the width an optimum size as well
        width = kOptimumPickerWidth;
        
    resultFrame = CGRectMake(0.0, -1.0, width, height);

    return resultFrame;
}


#pragma mark - UIPickerView

- (void)createPicker
{
	self.pickerViewArray = @[ @"John Appleseed", @"Chris Armstrong", @"Serena Auroux",
                              @"Susan Bean", @"Luis Becerra", @"Kate Bell", @"Alain Briere" ];
    
	// note we are using CGRectZero for the dimensions of our picker view,
	// this is because picker views have a built in optimum size,
	// you just need to set the correct origin in your view.
	//
	_myPickerView = [[UIPickerView alloc] initWithFrame:CGRectZero];
	
	[self.myPickerView sizeToFit];
    CGSize pickerSize = self.myPickerView.frame.size;
    self.myPickerView.frame = [self pickerFrameWithSize:pickerSize];
    
    self.myPickerView.autoresizingMask = UIViewAutoresizingFlexibleLeftMargin | UIViewAutoresizingFlexibleRightMargin;
    
	self.myPickerView.showsSelectionIndicator = YES;	// note this is defaulted to NO
	
	// this view controller is the data source and delegate
	self.myPickerView.delegate = self;
	self.myPickerView.dataSource = self;
	
	// add this picker to our view controller, initially hidden
	self.myPickerView.hidden = YES;
	[self.scrollView addSubview:self.myPickerView];
}


#pragma mark - UIPickerView - Date/Time

- (void)createDatePicker
{
	_datePickerView = [[UIDatePicker alloc] initWithFrame:CGRectZero];
	
	self.datePickerView.autoresizingMask = UIViewAutoresizingFlexibleLeftMargin | UIViewAutoresizingFlexibleRightMargin;
    
    self.datePickerView.datePickerMode = UIDatePickerModeDate;
	
	// note we are using CGRectZero for the dimensions of our picker view,
	// this is because picker views have a built in optimum size,
	// you just need to set the correct origin in your view.
	//
    [self.datePickerView sizeToFit];
	CGSize pickerSize = self.datePickerView.frame.size;
    self.datePickerView.frame = [self pickerFrameWithSize:pickerSize];
	
	// add this picker to our view controller, initially hidden
	self.datePickerView.hidden = YES;
	[self.scrollView addSubview:self.datePickerView];
}


#pragma mark - UIPickerView - Custom Picker

- (void)createCustomPicker
{
	_customPickerView = [[UIPickerView alloc] initWithFrame:CGRectZero];
	
	self.customPickerView.autoresizingMask = UIViewAutoresizingFlexibleLeftMargin | UIViewAutoresizingFlexibleRightMargin;
	
    // setup the data source and delegate for this picker
	self.customPickerDataSource = [[CustomPickerDataSource alloc] init];
	self.customPickerView.dataSource = self.customPickerDataSource;
	self.customPickerView.delegate = self.customPickerDataSource;
	
	// note we are using CGRectZero for the dimensions of our picker view,
	// this is because picker views have a built in optimum size,
	// you just need to set the correct origin in your view.
	//
	[self.customPickerView sizeToFit];
    CGSize pickerSize = self.customPickerView.frame.size;
    self.customPickerView.frame = [self pickerFrameWithSize:pickerSize];
	
	self.customPickerView.showsSelectionIndicator = YES;
	
	// add this picker to our view controller, initially hidden
	self.customPickerView.hidden = YES;
	[self.scrollView addSubview:self.customPickerView];
}


#pragma mark - Actions

- (void)showPicker:(UIView *)picker
{
	// hide the current picker and show the new one
	if (self.currentPicker)
	{
		self.currentPicker.hidden = YES;
		self.label.text = @"";
	}
	picker.hidden = NO;
	
	self.currentPicker = picker;	// remember the current picker so we can remove it later when another one is chosen
}

// for changing the date picker's style
- (IBAction)togglePickerStyle:(id)sender
{
	UISegmentedControl *segControl = sender;
	switch (segControl.selectedSegmentIndex)
	{
		case 0:	// Time
		{
			self.datePickerView.datePickerMode = UIDatePickerModeTime;
			self.segmentLabel.text = @"UIDatePickerModeTime";
			break;
		}
		case 1: // Date
		{	
			self.datePickerView.datePickerMode = UIDatePickerModeDate;
			self.segmentLabel.text = @"UIDatePickerModeDate";
			break;
		}
		case 2:	// Date & Time
		{
			self.datePickerView.datePickerMode = UIDatePickerModeDateAndTime;
			self.segmentLabel.text = @"UIDatePickerModeDateAndTime";
			break;
		}
		case 3:	// Counter
		{
			self.datePickerView.datePickerMode = UIDatePickerModeCountDownTimer;
			self.segmentLabel.text = @"UIDatePickerModeCountDownTimer";
			break;
		}
	}
	
	// in case we previously chose the Counter style picker, make sure
	// the current date is restored
	NSDate *today = [NSDate date];
	self.datePickerView.date = today;
}

// for changing between UIPickerView, UIDatePickerView and custom picker
- (IBAction)togglePickers:(id)sender
{
	UISegmentedControl *segControl = sender;
	switch (segControl.selectedSegmentIndex)
	{
		case 0:	// UIPickerView
		{
			self.pickerStyleSegmentedControl.hidden = YES;
			self.segmentLabel.hidden = YES;
			[self showPicker:self.myPickerView];
            
            // report the selection to the UI label
            self.label.text = [NSString stringWithFormat:@"%@ - %d",
                               [self.pickerViewArray objectAtIndex:[self.myPickerView selectedRowInComponent:0]],
                               (int)[self.myPickerView selectedRowInComponent:1]];
			break;
		}
		case 1: // UIDatePicker
		{	
			self.pickerStyleSegmentedControl.hidden = NO;
			self.segmentLabel.hidden = NO;
			[self showPicker:self.datePickerView];
            
            [self togglePickerStyle:self.pickerStyleSegmentedControl];
			break;
		}
			
		case 2:	// Custom
		{
			self.pickerStyleSegmentedControl.hidden = YES;
			self.segmentLabel.hidden = YES;
			[self showPicker:self.customPickerView];
			break;
		}
	}
}


#pragma mark - View Controller

- (void)viewDidLoad
{		
	[super viewDidLoad];
	
	self.title = NSLocalizedString(@"PickerTitle", @"");
	
    // set the content size of our scroll view to match the entire screen,
    // this will allow the content to scroll in landscape
    //
    [self.scrollView setContentSize:CGSizeMake(CGRectGetWidth(self.scrollView.frame),
                                               CGRectGetHeight(self.scrollView.frame) - CGRectGetHeight(self.navigationController.navigationBar.frame)
                                               )];
    
    [self createPicker];
	[self createDatePicker];
	[self createCustomPicker];
	
	// label for picker selection output
    CGRect labelFrame = CGRectMake(kLeftMargin,
                                   CGRectGetMaxY(self.myPickerView.frame) + 10.0,
                                   CGRectGetWidth(self.view.bounds) - (kRightMargin * 2.0),
                                   14.0);
	self.label = [[UILabel alloc] initWithFrame:labelFrame];
    self.label.font = [UIFont systemFontOfSize:12.0];
	self.label.textAlignment = NSTextAlignmentCenter;
	self.label.textColor = [UIColor blackColor];
	self.label.backgroundColor = [UIColor clearColor];
	self.label.autoresizingMask = UIViewAutoresizingFlexibleWidth;
	[self.scrollView addSubview:self.label];
	
	// start by showing the normal picker in date mode
	self.buttonBarSegmentedControl.selectedSegmentIndex = 0;
	self.datePickerView.datePickerMode = UIDatePickerModeDate;
    
    self.pickerStyleSegmentedControl.selectedSegmentIndex = 1;
}


#pragma mark - UIPickerViewDelegate

- (void)pickerView:(UIPickerView *)pickerView didSelectRow:(NSInteger)row inComponent:(NSInteger)component
{
	if (pickerView == self.myPickerView)	// don't show selection for the custom picker
	{
		// report the selection to the UI label
		self.label.text = [NSString stringWithFormat:@"%@ - %d",
						[self.pickerViewArray objectAtIndex:[pickerView selectedRowInComponent:0]],
						(int)[pickerView selectedRowInComponent:1]];
	}
}


#pragma mark - UIPickerViewDataSource

- (NSAttributedString *)pickerView:(UIPickerView *)pickerView attributedTitleForRow:(NSInteger)row forComponent:(NSInteger)component
{
    NSMutableAttributedString *attrTitle = nil;
    
    // note: for the custom picker we use custom views instead of titles
    if (pickerView == self.myPickerView)
    {
        if (row == 0)
        {
            NSString *title;
            if (component == 0)
                title = [self.pickerViewArray objectAtIndex:row];
            else
                title = [[NSNumber numberWithInt:row] stringValue];

            // apply red text for normal state
            attrTitle = [[NSMutableAttributedString alloc] initWithString:title];
            [attrTitle addAttribute:NSForegroundColorAttributeName
                              value:[UIColor redColor]
                              range:NSMakeRange(0, [attrTitle length])];
        }
    }
    
    return attrTitle;
}

- (NSString *)pickerView:(UIPickerView *)pickerView titleForRow:(NSInteger)row forComponent:(NSInteger)component
{
	NSString *returnStr = @"";
	
	// note: for the custom picker we use custom views instead of titles
	if (pickerView == self.myPickerView)
	{
		if (component == 0)
		{
			returnStr = [self.pickerViewArray objectAtIndex:row];
		}
		else
		{
			returnStr = [[NSNumber numberWithInt:row] stringValue];
		}
	}
	
	return returnStr;
}

- (CGFloat)pickerView:(UIPickerView *)pickerView widthForComponent:(NSInteger)component
{
	CGFloat componentWidth = 0.0;

	if (component == 0)
		componentWidth = 240.0;	// first column size is wider to hold names
	else
		componentWidth = 40.0;	// second column is narrower to show numbers

	return componentWidth;
}

- (CGFloat)pickerView:(UIPickerView *)pickerView rowHeightForComponent:(NSInteger)component
{
	return 40.0;
}

- (NSInteger)pickerView:(UIPickerView *)pickerView numberOfRowsInComponent:(NSInteger)component
{
	return [self.pickerViewArray count];
}

- (NSInteger)numberOfComponentsInPickerView:(UIPickerView *)pickerView
{
	return 2;
}


#pragma mark - UIViewController delegate methods

// called after this controller's view was dismissed, covered or otherwise hidden
- (void)viewWillDisappear:(BOOL)animated
{
	[super viewWillDisappear:animated];
    
    self.currentPicker.hidden = YES;
}

// called after this controller's view will appear
- (void)viewWillAppear:(BOOL)animated
{
	[super viewWillAppear:animated];
    
    [self togglePickers:self.buttonBarSegmentedControl];	// make sure the last picker is still showing
	
	// for aesthetic reasons (the background is black), make the nav bar black for this particular page
    self.navigationController.navigationBar.tintColor = [UIColor blackColor];
}

@end
