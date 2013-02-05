//
//  ViewController.h
//  WebViewApp
//
//  Created by Jonathan Lipps on 2/5/13.
//  Copyright (c) 2013 Appium Committers. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface ViewController : UIViewController <UITextFieldDelegate>
@property (weak, nonatomic) IBOutlet UITextField *urlField;
@property (weak, nonatomic) IBOutlet UIWebView *mainWebView;
- (IBAction)navBtnClicked:(id)sender;
- (IBAction)urlEditBegin:(id)sender;
- (BOOL)textFieldShouldReturn:(UITextField *)textField;

@end
