package io.appium.android.bootstrap.utils;

public class Point {

  public Double x;
  public Double y;

  public Point() {
    x = 0.0;
    y = 0.0;
  }

  public Point(final Double x, final Double y) {
    this.x = x;
    this.y = y;
  }

  public Point(final Object x, final Object y) {
    this.x = Double.parseDouble(x.toString());
    this.y = Double.parseDouble(y.toString());
  }

  public Point(final Point other) {
    x = other.x;
    y = other.y;
  }

  @Override
  public boolean equals(final Object obj) {
    if (this == obj) {
      return true;
    }
    if (obj == null) {
      return false;
    }
    if (getClass() != obj.getClass()) {
      return false;
    }
    final Point other = (Point) obj;
    if (x == null) {
      if (other.x != null) {
        return false;
      }
    } else if (!x.equals(other.x)) {
      return false;
    }
    if (y == null) {
      if (other.y != null) {
        return false;
      }
    } else if (!y.equals(other.y)) {
      return false;
    }
    return true;
  }

  @Override
  public int hashCode() {
    final int prime = 31;
    int result = 1;
    result = prime * result + (x == null ? 0 : x.hashCode());
    result = prime * result + (y == null ? 0 : y.hashCode());
    return result;
  }

  @Override
  public String toString() {
    return "[x=" + x + ", y=" + y + "]";
  }

}
