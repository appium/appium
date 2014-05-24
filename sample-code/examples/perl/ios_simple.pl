#! /usr/bin/perl

use strict;
use warnings;
use Test::More;
use Cwd qw/getcwd abs_path/;
use Selenium::Remote::Driver 0.20;

my $app = getcwd() . '/../../apps/TestApp/build/Release-iphonesimulator/TestApp.app';
my $caps = {
    app               => abs_path($app),
    browserName       => "",
    deviceName        => "iPhone Simulator",
    platformName      => "iOS",
    platformVersion   => "7.1"
};

my $driver = Selenium::Remote::Driver->new_from_caps(
    remote_server_addr   => "127.0.0.1",
    port                 => 4723,
    desired_capabilities => $caps
);

ok(defined $driver, 'Instantiated an iOS driver!');

my $expected_sum;
foreach (qw/1 2/) {
    my $text_field = $driver->find_element('TextField' . $_, 'name');
    my $rand = int(rand(20));
    $expected_sum += $rand;
    $text_field->send_keys($rand);
}

my $compute_button = $driver->find_element('ComputeSumButton', 'name');
$compute_button->click;

my $sum_element = $driver->find_element($expected_sum, 'name');
ok($sum_element->get_text eq $expected_sum, 'We can do addition!');

$driver->quit;

done_testing;
