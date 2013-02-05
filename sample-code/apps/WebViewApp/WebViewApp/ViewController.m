//
//  ViewController.m
//  WebViewApp
//
//  Created by Jonathan Lipps on 2/5/13.
//  Copyright (c) 2013 Appium Committers. All rights reserved.
//

#import "ViewController.h"

@interface ViewController ()

@end

@implementation ViewController

- (void)viewDidLoad
{
    [super viewDidLoad];
    self.urlField.delegate = self;
	// Do any additional setup after loading the view, typically from a nib.
    [self.mainWebView loadRequest:[NSURLRequest requestWithURL: [NSURL URLWithString: @"http://saucelabs.com/test/guinea-pig"]]];
    self.urlField.text = @"http://saucelabs.com/test/guinea-pig";
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (IBAction)navBtnClicked:(id)sender {
    [self.mainWebView loadRequest:[NSURLRequest requestWithURL: [NSURL URLWithString: self.urlField.text]]];
}

- (IBAction)urlEditBegin:(id)sender {
    self.urlField.text = @"";
}

- (BOOL)textFieldShouldReturn:(UITextField *)textField {
    [textField resignFirstResponder];
    [self navBtnClicked:nil];
    return YES;
}
@end
