on run argv
    if (count of argv) > 1 then
        set appName to item 1 of argv
        set delayInSec to item 2 of argv as integer
    end if
    tell application "System Events" to tell process "Simulator"
        activate
        set frontmost to true
        keystroke "h" using {shift down, command down} # background app
        delay delayInSec
        keystroke "h" using {shift down, command down} # go to home screen, page 1
        delay 1
        tell slider 1 of window 1
            set pos to position
            set s to size
        end tell
        set sliderTitle to title of slider 1 of window 1
        set pageTotalText to text ((offset of "of " in sliderTitle) + 2) thru -1 in sliderTitle
        set numCount to count of characters in pageTotalText
        set pageTotal to pageTotalText as integer
        
        repeat while pageTotal > 0 and appName is not in title of UI elements of window 1
            click at {((item 1 of pos) + (item 1 of s) * 0.7), ((item 2 of pos) + (item 2 of s) / 2)}
            delay 1
            set pageTotal to pageTotal - 1
        end repeat
        click UI element appName of window 1
        delay 1 # give it a few moment to launch
    end tell
end run
