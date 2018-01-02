//
//  GestureTestViewController.m
//  TestApp
//
//  Created by ThinkSys- Amit on 12/07/13.
//
//

#import "GestureTestViewController.h"

@interface GestureTestViewController ()

@end

@implementation GestureTestViewController

- (id)initWithNibName:(NSString *)nibNameOrNil bundle:(NSBundle *)nibBundleOrNil
{
    self = [super initWithNibName:nibNameOrNil bundle:nibBundleOrNil];
    if (self) {
        // Custom initialization
    }
    return self;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
    // Do any additional setup after loading the view from its nib.
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (IBAction)handleRotation:(UIRotationGestureRecognizer*)sender
{
    NSLog(@"Rotation Starts");
    sender.view.transform = CGAffineTransformRotate(sender.view.transform, sender.rotation);
    sender.rotation = 0;
}
- (void)dealloc {
    [_mapView release];
    [super dealloc];
}
@end
