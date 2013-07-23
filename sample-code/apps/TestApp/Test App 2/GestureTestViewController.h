//
//  GestureTestViewController.h
//  TestApp
//
//  Created by ThinkSys- Amit on 12/07/13.
//
//

#import <UIKit/UIKit.h>
#import <MapKit/MapKit.h>

@interface GestureTestViewController : UIViewController<UIGestureRecognizerDelegate>
@property (retain, nonatomic) IBOutlet MKMapView *mapView;


- (IBAction)handleRotation:(UIRotationGestureRecognizer*)sender;

@end
