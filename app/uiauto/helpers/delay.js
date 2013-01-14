function delay(secs)
{
    var date = new Date();
    var curDate = null;

    do { curDate = new Date(); }
    while(curDate-date < (secs * 1000.0));
}

