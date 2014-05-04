//
//  ViewController.m
//  WebViewApp
//
//  Created by Jonathan Lipps on 2/5/13.
//  Copyright (c) 2013 Appium Committers. All rights reserved.
//

#import "ViewController.h"


@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    self.urlField.delegate = self;
    self.mainWebView.delegate = self;
    self.pageLoadingIndicator = [[UIActivityIndicatorView alloc] initWithActivityIndicatorStyle:UIActivityIndicatorViewStyleGray];
    self.pageLoadingIndicator.hidesWhenStopped = YES;
    self.urlField.rightView = self.pageLoadingIndicator;
    self.urlField.rightViewMode = UITextFieldViewModeAlways;
}

- (BOOL)shouldAutorotateToInterfaceOrientation:(UIInterfaceOrientation)interfaceOrientation {
    return YES;
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (IBAction)navBtnClicked:(id)sender {
    NSLog(@"changing url to %@", self.urlField.text);
    [self.mainWebView
     loadRequest:[NSURLRequest
                  requestWithURL: [NSURL
                                   URLWithString: self.urlField.text]]];
}

- (IBAction)urlEditBegin:(id)sender {
    if ([self.urlField.text isEqualToString:@""]) {
        self.urlField.text = @"http://";
    }
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
    [textField resignFirstResponder];
    [self navBtnClicked:nil];
    return YES;
}

- (BOOL)webView:(UIWebView *)webView shouldStartLoadWithRequest:(NSURLRequest *)request navigationType:(UIWebViewNavigationType)navigationType {
    NSString *url = [[request URL] absoluteString];
    NSLog(@"URL change request: %@", url);
    self.urlField.text = url;
    return YES;
}

- (void)webViewDidFinishLoad:(UIWebView *)webView {
    NSLog(@"Webview finished loading %@", [[webView.request URL] absoluteString]);
    [self.pageLoadingIndicator stopAnimating];
}

- (void)webViewDidStartLoad:(UIWebView *)webView {
    NSLog(@"Webview started loading");
    [self.pageLoadingIndicator startAnimating];
}

@end

@implementation NSURLRequest (NSURLRequestWithIgnoreSSL)

+ (BOOL)allowsAnyHTTPSCertificateForHost:(NSString *)host
{
    return YES;
}

@end
