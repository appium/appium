on run argv
  set image_file to item 1 of argv
  set rotate_value to item 2 of argv
  tell application "Image Events"
    try
      set rotate_file to open image_file
      rotate rotate_file to angle rotate_value
      save rotate_file
      close rotate_file
    end try
  end tell
end run
