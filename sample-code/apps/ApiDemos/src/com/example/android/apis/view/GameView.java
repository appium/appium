/*
 * Copyright (C) 2011 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.example.android.apis.view;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Paint.Style;
import android.os.Handler;
import android.os.SystemClock;
import android.os.Vibrator;
import android.util.AttributeSet;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * A trivial joystick based physics game to demonstrate joystick handling.
 *
 * If the game controller has a vibrator, then it is used to provide feedback
 * when a bullet is fired or the ship crashes into an obstacle.  Otherwise, the
 * system vibrator is used for that purpose.
 *
 * @see GameControllerInput
 */
public class GameView extends View {
    private final long ANIMATION_TIME_STEP = 1000 / 60;
    private final int MAX_OBSTACLES = 12;

    private final Random mRandom;
    private Ship mShip;
    private final List<Bullet> mBullets;
    private final List<Obstacle> mObstacles;

    private long mLastStepTime;
    private InputDevice mLastInputDevice;

    private static final int DPAD_STATE_LEFT  = 1 << 0;
    private static final int DPAD_STATE_RIGHT = 1 << 1;
    private static final int DPAD_STATE_UP    = 1 << 2;
    private static final int DPAD_STATE_DOWN  = 1 << 3;

    private int mDPadState;

    private float mShipSize;
    private float mMaxShipThrust;
    private float mMaxShipSpeed;

    private float mBulletSize;
    private float mBulletSpeed;

    private float mMinObstacleSize;
    private float mMaxObstacleSize;
    private float mMinObstacleSpeed;
    private float mMaxObstacleSpeed;

    private final Runnable mAnimationRunnable = new Runnable() {
        public void run() {
            animateFrame();
        }
    };

    public GameView(Context context, AttributeSet attrs) {
        super(context, attrs);

        mRandom = new Random();
        mBullets = new ArrayList<Bullet>();
        mObstacles = new ArrayList<Obstacle>();

        setFocusable(true);
        setFocusableInTouchMode(true);

        float baseSize = getContext().getResources().getDisplayMetrics().density * 5f;
        float baseSpeed = baseSize * 3;

        mShipSize = baseSize * 3;
        mMaxShipThrust = baseSpeed * 0.25f;
        mMaxShipSpeed = baseSpeed * 12;

        mBulletSize = baseSize;
        mBulletSpeed = baseSpeed * 12;

        mMinObstacleSize = baseSize * 2;
        mMaxObstacleSize = baseSize * 12;
        mMinObstacleSpeed = baseSpeed;
        mMaxObstacleSpeed = baseSpeed * 3;
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);

        // Reset the game when the view changes size.
        reset();
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        ensureInitialized();

        // Handle DPad keys and fire button on initial down but not on auto-repeat.
        boolean handled = false;
        if (event.getRepeatCount() == 0) {
            switch (keyCode) {
                case KeyEvent.KEYCODE_DPAD_LEFT:
                    mShip.setHeadingX(-1);
                    mDPadState |= DPAD_STATE_LEFT;
                    handled = true;
                    break;
                case KeyEvent.KEYCODE_DPAD_RIGHT:
                    mShip.setHeadingX(1);
                    mDPadState |= DPAD_STATE_RIGHT;
                    handled = true;
                    break;
                case KeyEvent.KEYCODE_DPAD_UP:
                    mShip.setHeadingY(-1);
                    mDPadState |= DPAD_STATE_UP;
                    handled = true;
                    break;
                case KeyEvent.KEYCODE_DPAD_DOWN:
                    mShip.setHeadingY(1);
                    mDPadState |= DPAD_STATE_DOWN;
                    handled = true;
                    break;
                default:
                    if (isFireKey(keyCode)) {
                        fire();
                        handled = true;
                    }
                    break;
            }
        }
        if (handled) {
            step(event.getEventTime());
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        ensureInitialized();

        // Handle keys going up.
        boolean handled = false;
        switch (keyCode) {
            case KeyEvent.KEYCODE_DPAD_LEFT:
                mShip.setHeadingX(0);
                mDPadState &= ~DPAD_STATE_LEFT;
                handled = true;
                break;
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                mShip.setHeadingX(0);
                mDPadState &= ~DPAD_STATE_RIGHT;
                handled = true;
                break;
            case KeyEvent.KEYCODE_DPAD_UP:
                mShip.setHeadingY(0);
                mDPadState &= ~DPAD_STATE_UP;
                handled = true;
                break;
            case KeyEvent.KEYCODE_DPAD_DOWN:
                mShip.setHeadingY(0);
                mDPadState &= ~DPAD_STATE_DOWN;
                handled = true;
                break;
            default:
                if (isFireKey(keyCode)) {
                    handled = true;
                }
                break;
        }
        if (handled) {
            step(event.getEventTime());
            return true;
        }
        return super.onKeyUp(keyCode, event);
    }

    private static boolean isFireKey(int keyCode) {
        return KeyEvent.isGamepadButton(keyCode)
                || keyCode == KeyEvent.KEYCODE_DPAD_CENTER
                || keyCode == KeyEvent.KEYCODE_SPACE;
    }

    @Override
    public boolean onGenericMotionEvent(MotionEvent event) {
        ensureInitialized();

        // Check that the event came from a joystick since a generic motion event
        // could be almost anything.
        if ((event.getSource() & InputDevice.SOURCE_CLASS_JOYSTICK) != 0
                && event.getAction() == MotionEvent.ACTION_MOVE) {
            // Cache the most recently obtained device information.
            // The device information may change over time but it can be
            // somewhat expensive to query.
            if (mLastInputDevice == null || mLastInputDevice.getId() != event.getDeviceId()) {
                mLastInputDevice = event.getDevice();
                // It's possible for the device id to be invalid.
                // In that case, getDevice() will return null.
                if (mLastInputDevice == null) {
                    return false;
                }
            }

            // Ignore joystick while the DPad is pressed to avoid conflicting motions.
            if (mDPadState != 0) {
                return true;
            }

            // Process all historical movement samples in the batch.
            final int historySize = event.getHistorySize();
            for (int i = 0; i < historySize; i++) {
                processJoystickInput(event, i);
            }

            // Process the current movement sample in the batch.
            processJoystickInput(event, -1);
            return true;
        }
        return super.onGenericMotionEvent(event);
    }

    private void processJoystickInput(MotionEvent event, int historyPos) {
        // Get joystick position.
        // Many game pads with two joysticks report the position of the second joystick
        // using the Z and RZ axes so we also handle those.
        // In a real game, we would allow the user to configure the axes manually.
        float x = getCenteredAxis(event, mLastInputDevice, MotionEvent.AXIS_X, historyPos);
        if (x == 0) {
            x = getCenteredAxis(event, mLastInputDevice, MotionEvent.AXIS_HAT_X, historyPos);
        }
        if (x == 0) {
            x = getCenteredAxis(event, mLastInputDevice, MotionEvent.AXIS_Z, historyPos);
        }

        float y = getCenteredAxis(event, mLastInputDevice, MotionEvent.AXIS_Y, historyPos);
        if (y == 0) {
            y = getCenteredAxis(event, mLastInputDevice, MotionEvent.AXIS_HAT_Y, historyPos);
        }
        if (y == 0) {
            y = getCenteredAxis(event, mLastInputDevice, MotionEvent.AXIS_RZ, historyPos);
        }

        // Set the ship heading.
        mShip.setHeading(x, y);
        step(historyPos < 0 ? event.getEventTime() : event.getHistoricalEventTime(historyPos));
    }

    private static float getCenteredAxis(MotionEvent event, InputDevice device,
            int axis, int historyPos) {
        final InputDevice.MotionRange range = device.getMotionRange(axis, event.getSource());
        if (range != null) {
            final float flat = range.getFlat();
            final float value = historyPos < 0 ? event.getAxisValue(axis)
                    : event.getHistoricalAxisValue(axis, historyPos);

            // Ignore axis values that are within the 'flat' region of the joystick axis center.
            // A joystick at rest does not always report an absolute position of (0,0).
            if (Math.abs(value) > flat) {
                return value;
            }
        }
        return 0;
    }

    @Override
    public void onWindowFocusChanged(boolean hasWindowFocus) {
        // Turn on and off animations based on the window focus.
        // Alternately, we could update the game state using the Activity onResume()
        // and onPause() lifecycle events.
        if (hasWindowFocus) {
            getHandler().postDelayed(mAnimationRunnable, ANIMATION_TIME_STEP);
            mLastStepTime = SystemClock.uptimeMillis();
        } else {
            getHandler().removeCallbacks(mAnimationRunnable);

            mDPadState = 0;
            if (mShip != null) {
                mShip.setHeading(0, 0);
                mShip.setVelocity(0, 0);
            }
        }

        super.onWindowFocusChanged(hasWindowFocus);
    }

    private void fire() {
        if (mShip != null && !mShip.isDestroyed()) {
            Bullet bullet = new Bullet();
            bullet.setPosition(mShip.getBulletInitialX(), mShip.getBulletInitialY());
            bullet.setVelocity(mShip.getBulletVelocityX(mBulletSpeed),
                    mShip.getBulletVelocityY(mBulletSpeed));
            mBullets.add(bullet);

            getVibrator().vibrate(20);
        }
    }

    private void ensureInitialized() {
        if (mShip == null) {
            reset();
        }
    }

    private void crash() {
        getVibrator().vibrate(new long[] { 0, 20, 20, 40, 40, 80, 40, 300 }, -1);
    }

    private void reset() {
        mShip = new Ship();
        mBullets.clear();
        mObstacles.clear();
    }

    private Vibrator getVibrator() {
        if (mLastInputDevice != null) {
            Vibrator vibrator = mLastInputDevice.getVibrator();
            if (vibrator.hasVibrator()) {
                return vibrator;
            }
        }
        return (Vibrator)getContext().getSystemService(Context.VIBRATOR_SERVICE);
    }

    void animateFrame() {
        long currentStepTime = SystemClock.uptimeMillis();
        step(currentStepTime);

        Handler handler = getHandler();
        if (handler != null) {
            handler.postAtTime(mAnimationRunnable, currentStepTime + ANIMATION_TIME_STEP);
            invalidate();
        }
    }

    private void step(long currentStepTime) {
        float tau = (currentStepTime - mLastStepTime) * 0.001f;
        mLastStepTime = currentStepTime;

        ensureInitialized();

        // Move the ship.
        mShip.accelerate(tau, mMaxShipThrust, mMaxShipSpeed);
        if (!mShip.step(tau)) {
            reset();
        }

        // Move the bullets.
        int numBullets = mBullets.size();
        for (int i = 0; i < numBullets; i++) {
            final Bullet bullet = mBullets.get(i);
            if (!bullet.step(tau)) {
                mBullets.remove(i);
                i -= 1;
                numBullets -= 1;
            }
        }

        // Move obstacles.
        int numObstacles = mObstacles.size();
        for (int i = 0; i < numObstacles; i++) {
            final Obstacle obstacle = mObstacles.get(i);
            if (!obstacle.step(tau)) {
                mObstacles.remove(i);
                i -= 1;
                numObstacles -= 1;
            }
        }

        // Check for collisions between bullets and obstacles.
        for (int i = 0; i < numBullets; i++) {
            final Bullet bullet = mBullets.get(i);
            for (int j = 0; j < numObstacles; j++) {
                final Obstacle obstacle = mObstacles.get(j);
                if (bullet.collidesWith(obstacle)) {
                    bullet.destroy();
                    obstacle.destroy();
                    break;
                }
            }
        }

        // Check for collisions between the ship and obstacles.
        for (int i = 0; i < numObstacles; i++) {
            final Obstacle obstacle = mObstacles.get(i);
            if (mShip.collidesWith(obstacle)) {
                mShip.destroy();
                obstacle.destroy();
                break;
            }
        }

        // Spawn more obstacles offscreen when needed.
        // Avoid putting them right on top of the ship.
        OuterLoop: while (mObstacles.size() < MAX_OBSTACLES) {
            final float minDistance = mShipSize * 4;
            float size = mRandom.nextFloat() * (mMaxObstacleSize - mMinObstacleSize)
                    + mMinObstacleSize;
            float positionX, positionY;
            int tries = 0;
            do {
                int edge = mRandom.nextInt(4);
                switch (edge) {
                    case 0:
                        positionX = -size;
                        positionY = mRandom.nextInt(getHeight());
                        break;
                    case 1:
                        positionX = getWidth() + size;
                        positionY = mRandom.nextInt(getHeight());
                        break;
                    case 2:
                        positionX = mRandom.nextInt(getWidth());
                        positionY = -size;
                        break;
                    default:
                        positionX = mRandom.nextInt(getWidth());
                        positionY = getHeight() + size;
                        break;
                }
                if (++tries > 10) {
                    break OuterLoop;
                }
            } while (mShip.distanceTo(positionX, positionY) < minDistance);

            float direction = mRandom.nextFloat() * (float) Math.PI * 2;
            float speed = mRandom.nextFloat() * (mMaxObstacleSpeed - mMinObstacleSpeed)
                    + mMinObstacleSpeed;
            float velocityX = (float) Math.cos(direction) * speed;
            float velocityY = (float) Math.sin(direction) * speed;

            Obstacle obstacle = new Obstacle();
            obstacle.setPosition(positionX, positionY);
            obstacle.setSize(size);
            obstacle.setVelocity(velocityX, velocityY);
            mObstacles.add(obstacle);
        }
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);

        // Draw the ship.
        if (mShip != null) {
            mShip.draw(canvas);
        }

        // Draw bullets.
        int numBullets = mBullets.size();
        for (int i = 0; i < numBullets; i++) {
            final Bullet bullet = mBullets.get(i);
            bullet.draw(canvas);
        }

        // Draw obstacles.
        int numObstacles = mObstacles.size();
        for (int i = 0; i < numObstacles; i++) {
            final Obstacle obstacle = mObstacles.get(i);
            obstacle.draw(canvas);
        }
    }

    static float pythag(float x, float y) {
        return (float) Math.sqrt(x * x + y * y);
    }

    static int blend(float alpha, int from, int to) {
        return from + (int) ((to - from) * alpha);
    }

    static void setPaintARGBBlend(Paint paint, float alpha,
            int a1, int r1, int g1, int b1,
            int a2, int r2, int g2, int b2) {
        paint.setARGB(blend(alpha, a1, a2), blend(alpha, r1, r2),
                blend(alpha, g1, g2), blend(alpha, b1, b2));
    }

    private abstract class Sprite {
        protected float mPositionX;
        protected float mPositionY;
        protected float mVelocityX;
        protected float mVelocityY;
        protected float mSize;
        protected boolean mDestroyed;
        protected float mDestroyAnimProgress;

        public void setPosition(float x, float y) {
            mPositionX = x;
            mPositionY = y;
        }

        public void setVelocity(float x, float y) {
            mVelocityX = x;
            mVelocityY = y;
        }

        public void setSize(float size) {
            mSize = size;
        }

        public float distanceTo(float x, float y) {
            return pythag(mPositionX - x, mPositionY - y);
        }

        public float distanceTo(Sprite other) {
            return distanceTo(other.mPositionX, other.mPositionY);
        }

        public boolean collidesWith(Sprite other) {
            // Really bad collision detection.
            return !mDestroyed && !other.mDestroyed
                    && distanceTo(other) <= Math.max(mSize, other.mSize)
                            + Math.min(mSize, other.mSize) * 0.5f;
        }

        public boolean isDestroyed() {
            return mDestroyed;
        }

        public boolean step(float tau) {
            mPositionX += mVelocityX * tau;
            mPositionY += mVelocityY * tau;

            if (mDestroyed) {
                mDestroyAnimProgress += tau / getDestroyAnimDuration();
                if (mDestroyAnimProgress >= 1.0f) {
                    return false;
                }
            }
            return true;
        }

        public abstract void draw(Canvas canvas);

        public abstract float getDestroyAnimDuration();

        protected boolean isOutsidePlayfield() {
            final int width = GameView.this.getWidth();
            final int height = GameView.this.getHeight();
            return mPositionX < 0 || mPositionX >= width
                    || mPositionY < 0 || mPositionY >= height;
        }

        protected void wrapAtPlayfieldBoundary() {
            final int width = GameView.this.getWidth();
            final int height = GameView.this.getHeight();
            while (mPositionX <= -mSize) {
                mPositionX += width + mSize * 2;
            }
            while (mPositionX >= width + mSize) {
                mPositionX -= width + mSize * 2;
            }
            while (mPositionY <= -mSize) {
                mPositionY += height + mSize * 2;
            }
            while (mPositionY >= height + mSize) {
                mPositionY -= height + mSize * 2;
            }
        }

        public void destroy() {
            mDestroyed = true;
            step(0);
        }
    }

    private class Ship extends Sprite {
        private static final float CORNER_ANGLE = (float) Math.PI * 2 / 3;
        private static final float TO_DEGREES = (float) (180.0 / Math.PI);

        private float mHeadingX;
        private float mHeadingY;
        private float mHeadingAngle;
        private float mHeadingMagnitude;
        private final Paint mPaint;
        private final Path mPath;


        public Ship() {
            mPaint = new Paint();
            mPaint.setStyle(Style.FILL);

            setPosition(getWidth() * 0.5f, getHeight() * 0.5f);
            setVelocity(0, 0);
            setSize(mShipSize);

            mPath = new Path();
            mPath.moveTo(0, 0);
            mPath.lineTo((float)Math.cos(-CORNER_ANGLE) * mSize,
                    (float)Math.sin(-CORNER_ANGLE) * mSize);
            mPath.lineTo(mSize, 0);
            mPath.lineTo((float)Math.cos(CORNER_ANGLE) * mSize,
                    (float)Math.sin(CORNER_ANGLE) * mSize);
            mPath.lineTo(0, 0);
        }

        public void setHeadingX(float x) {
            mHeadingX = x;
            updateHeading();
        }

        public void setHeadingY(float y) {
            mHeadingY = y;
            updateHeading();
        }

        public void setHeading(float x, float y) {
            mHeadingX = x;
            mHeadingY = y;
            updateHeading();
        }

        private void updateHeading() {
            mHeadingMagnitude = pythag(mHeadingX, mHeadingY);
            if (mHeadingMagnitude > 0.1f) {
                mHeadingAngle = (float) Math.atan2(mHeadingY, mHeadingX);
            }
        }

        private float polarX(float radius) {
            return (float) Math.cos(mHeadingAngle) * radius;
        }

        private float polarY(float radius) {
            return (float) Math.sin(mHeadingAngle) * radius;
        }

        public float getBulletInitialX() {
            return mPositionX + polarX(mSize);
        }

        public float getBulletInitialY() {
            return mPositionY + polarY(mSize);
        }

        public float getBulletVelocityX(float relativeSpeed) {
            return mVelocityX + polarX(relativeSpeed);
        }

        public float getBulletVelocityY(float relativeSpeed) {
            return mVelocityY + polarY(relativeSpeed);
        }

        public void accelerate(float tau, float maxThrust, float maxSpeed) {
            final float thrust = mHeadingMagnitude * maxThrust;
            mVelocityX += polarX(thrust);
            mVelocityY += polarY(thrust);

            final float speed = pythag(mVelocityX, mVelocityY);
            if (speed > maxSpeed) {
                final float scale = maxSpeed / speed;
                mVelocityX = mVelocityX * scale;
                mVelocityY = mVelocityY * scale;
            }
        }

        @Override
        public boolean step(float tau) {
            if (!super.step(tau)) {
                return false;
            }
            wrapAtPlayfieldBoundary();
            return true;
        }

        public void draw(Canvas canvas) {
            setPaintARGBBlend(mPaint, mDestroyAnimProgress,
                    255, 63, 255, 63,
                    0, 255, 0, 0);

            canvas.save(Canvas.MATRIX_SAVE_FLAG);
            canvas.translate(mPositionX, mPositionY);
            canvas.rotate(mHeadingAngle * TO_DEGREES);
            canvas.drawPath(mPath, mPaint);
            canvas.restore();
        }

        @Override
        public float getDestroyAnimDuration() {
            return 1.0f;
        }

        @Override
        public void destroy() {
            super.destroy();
            crash();
        }
    }

    private class Bullet extends Sprite {
        private final Paint mPaint;

        public Bullet() {
            mPaint = new Paint();
            mPaint.setStyle(Style.FILL);

            setSize(mBulletSize);
        }

        @Override
        public boolean step(float tau) {
            if (!super.step(tau)) {
                return false;
            }
            return !isOutsidePlayfield();
        }

        public void draw(Canvas canvas) {
            setPaintARGBBlend(mPaint, mDestroyAnimProgress,
                    255, 255, 255, 0,
                    0, 255, 255, 255);
            canvas.drawCircle(mPositionX, mPositionY, mSize, mPaint);
        }

        @Override
        public float getDestroyAnimDuration() {
            return 0.125f;
        }
    }

    private class Obstacle extends Sprite {
        private final Paint mPaint;

        public Obstacle() {
            mPaint = new Paint();
            mPaint.setARGB(255, 127, 127, 255);
            mPaint.setStyle(Style.FILL);
        }

        @Override
        public boolean step(float tau) {
            if (!super.step(tau)) {
                return false;
            }
            wrapAtPlayfieldBoundary();
            return true;
        }

        public void draw(Canvas canvas) {
            setPaintARGBBlend(mPaint, mDestroyAnimProgress,
                    255, 127, 127, 255,
                    0, 255, 0, 0);
            canvas.drawCircle(mPositionX, mPositionY,
                    mSize * (1.0f - mDestroyAnimProgress), mPaint);
        }

        @Override
        public float getDestroyAnimDuration() {
            return 0.25f;
        }
    }
}