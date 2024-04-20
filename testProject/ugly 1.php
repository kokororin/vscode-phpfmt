<?php
// This is a file with a space in the name
class Ugly{
private   $ugly;

public function __construct($ugly){
    $this->ugly=$ugly;
          }

          public function getUgly()
      {
        return $this->ugly;
      }
}
