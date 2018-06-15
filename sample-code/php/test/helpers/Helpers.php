<?php

class Helpers {

  public static function elemsBy($driver, $using, $tag)
  {
    return $driver->elements($driver->using($using)->value($tag));
  }

  public static function waitForElemsBy($driver, $using, $tag)
  {
    $element;
    $i = 0;
    while ($i < 20) {
        $element = $driver->elements($driver->using("id")->value($tag));
        if ($element) {
            break;
        }
        sleep(1);
    }
    return $element;
  }

  public static function elemBy($driver, $using, $tag)
  {
    $elems = Helpers::elemsBy($driver, $using, $tag);
    if ($elems) 
    {
      return $elems[0];
    }
  }

  public static function waitForElemBy($driver, $using, $tag)
  {
    $elems = Helpers::waitForElemsBy($driver, $using, $tag);
    if ($elems) 
    {
      return $elems[0];
    }
  }

}

?>