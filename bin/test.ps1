param([string]$mochaArgs = "", [switch]$android, [switch]$selendroid)
$all = !($android -or $selendroid)
$appiumMocha="mocha --recursive -t 90000 -R spec $mochaArgs "

if ($android -or $all){
  "RUNNING ANDROID TESTS"
  "---------------------"
  Invoke-Expression ($appiumMocha + "test\functional\android test\functional\common -g '@skip-android-all' -i")
}

if ($selendroid -or $all){
  "RUNNING SELENDROID TESTS"
  "------------------------"
  Invoke-Expression ($appiumMocha + "test\functional\selendroid -g '@skip-selendroid-all' -i")
}