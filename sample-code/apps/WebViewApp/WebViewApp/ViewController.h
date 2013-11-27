//
//  ViewController.h
//  WebViewApp
//
//  Created by Jonathan Lipps on 2/5/13.
//  Copyright (c) 2013 Appium Committers. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface ViewController : UIViewController <UITextFieldDelegate, UIWebViewDelegate, NSURLConnectionDataDelegate>
@property (weak, nonatomic) IBOutlet UITextField *urlField;
@property (weak, nonatomic) IBOutlet UIWebView *mainWebView;
@property UIActivityIndicatorView *pageLoadingIndicator;
- (IBAction)navBtnClicked:(id)sender;
- (IBAction)urlEditBegin:(id)sender;
- (BOOL)textFieldShouldReturn:(UITextField *)textField;
- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType;
- (void)webViewDidFinishLoad:(UIWebView *)webView;
- (void)webViewDidStartLoad:(UIWebView *)webView;
@end

