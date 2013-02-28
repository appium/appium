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

package com.example.android.apis.accessibility;

import android.app.Activity;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Build;
import android.os.Bundle;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextPaint;
import android.text.TextUtils;
import android.util.AttributeSet;
import android.util.TypedValue;
import android.view.View;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import com.example.android.apis.R;

/**
 * Demonstrates how to implement accessibility support of custom views. Custom view
 * is a tailored widget developed by extending the base classes in the android.view
 * package. This sample shows how to implement the accessibility behavior via both
 * inheritance (non backwards compatible) and composition (backwards compatible).
 * <p>
 * While the Android framework has a diverse portfolio of views tailored for various
 * use cases, sometimes a developer needs a specific functionality not implemented
 * by the standard views. A solution is to write a custom view that extends one the
 * base view classes. While implementing the desired functionality a developer should
 * also implement accessibility support for that new functionality such that
 * disabled users can leverage it.
 * </p>
 */
public class CustomViewAccessibilityActivity extends Activity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.custom_view_accessibility);
    }

    /**
     * Demonstrates how to enhance the accessibility support via inheritance.
     * <p>
     * <strong>Note:</strong> Using inheritance may break your application's
     * backwards compatibility. In particular, overriding a method that takes as
     * an argument or returns a class not present on an older platform
     * version will prevent your application from running on that platform.
     * For example, {@link AccessibilityNodeInfo} was introduced in
     * {@link Build.VERSION_CODES#ICE_CREAM_SANDWICH API 14}, thus overriding
     * {@link View#onInitializeAccessibilityNodeInfo(AccessibilityNodeInfo)
     *  View.onInitializeAccessibilityNodeInfo(AccessibilityNodeInfo)}
     * will prevent you application from running on a platform older than
     * {@link Build.VERSION_CODES#ICE_CREAM_SANDWICH API 14}.
     * </p>
     */
    public static class AccessibleCompoundButtonInheritance extends BaseToggleButton {

        public AccessibleCompoundButtonInheritance(Context context, AttributeSet attrs) {
            super(context, attrs);
        }

        @Override
        public void onInitializeAccessibilityEvent(AccessibilityEvent event) {
            super.onInitializeAccessibilityEvent(event);
            // We called the super implementation to let super classes
            // set appropriate event properties. Then we add the new property
            // (checked) which is not supported by a super class.
            event.setChecked(isChecked());
        }

        @Override
        public void onInitializeAccessibilityNodeInfo(AccessibilityNodeInfo info) {
            super.onInitializeAccessibilityNodeInfo(info);
            // We called the super implementation to let super classes set
            // appropriate info properties. Then we add our properties
            // (checkable and checked) which are not supported by a super class.
            info.setCheckable(true);
            info.setChecked(isChecked());
            // Very often you will need to add only the text on the custom view.
            CharSequence text = getText();
            if (!TextUtils.isEmpty(text)) {
                info.setText(text);
            }
        }

        @Override
        public void onPopulateAccessibilityEvent(AccessibilityEvent event) {
            super.onPopulateAccessibilityEvent(event);
            // We called the super implementation to populate its text to the
            // event. Then we add our text not present in a super class.
            // Very often you will need to add only the text on the custom view.
            CharSequence text = getText();
            if (!TextUtils.isEmpty(text)) {
                event.getText().add(text);
            }
        }
    }

    /**
     * Demonstrates how to enhance the accessibility support via composition.
     * <p>
     * <strong>Note:</strong> Using composition ensures that your application is
     * backwards compatible. The android-support-v4 library has API that allow
     * using the accessibility APIs in a backwards compatible manner.
     * </p>
     */
    public static class AccessibleCompoundButtonComposition extends BaseToggleButton {

        public AccessibleCompoundButtonComposition(Context context, AttributeSet attrs) {
            super(context, attrs);
            tryInstallAccessibilityDelegate();
        }

        public void tryInstallAccessibilityDelegate() {
            // If the API version of the platform we are running is too old
            // and does not support the AccessibilityDelegate APIs, do not
            // call View.setAccessibilityDelegate(AccessibilityDelegate) or
            // refer to AccessibilityDelegate, otherwise an exception will
            // be thrown.
            // NOTE: The android-support-v4 library contains APIs the enable
            // using the accessibility APIs in a backwards compatible fashion.
            if (Build.VERSION.SDK_INT < 14) {
                return;
            }
            // AccessibilityDelegate allows clients to override its methods that
            // correspond to the accessibility methods in View and register the
            // delegate in the View essentially injecting the accessibility support.
            setAccessibilityDelegate(new AccessibilityDelegate() {
                @Override
                public void onInitializeAccessibilityEvent(View host, AccessibilityEvent event) {
                    super.onInitializeAccessibilityEvent(host, event);
                    // We called the super implementation to let super classes
                    // set appropriate event properties. Then we add the new property
                    // (checked) which is not supported by a super class.
                    event.setChecked(isChecked());
                }

                @Override
                public void onInitializeAccessibilityNodeInfo(View host,
                        AccessibilityNodeInfo info) {
                    super.onInitializeAccessibilityNodeInfo(host, info);
                    // We called the super implementation to let super classes set
                    // appropriate info properties. Then we add our properties
                    // (checkable and checked) which are not supported by a super class.
                    info.setCheckable(true);
                    info.setChecked(isChecked());
                    // Very often you will need to add only the text on the custom view.
                    CharSequence text = getText();
                    if (!TextUtils.isEmpty(text)) {
                        info.setText(text);
                    }
                }

                @Override
                public void onPopulateAccessibilityEvent(View host, AccessibilityEvent event) {
                    super.onPopulateAccessibilityEvent(host, event);
                    // We called the super implementation to populate its text to the
                    // event. Then we add our text not present in a super class.
                    // Very often you will need to add only the text on the custom view.
                    CharSequence text = getText();
                    if (!TextUtils.isEmpty(text)) {
                        event.getText().add(text);
                    }
                }
            });
        }
    }

    /**
     * This is a base toggle button class whose accessibility is not tailored
     * to reflect the new functionality it implements.
     * <p>
     * <strong>Note:</strong> This is not a sample implementation of a toggle
     * button, rather a simple class needed to demonstrate how to refine the
     * accessibility support of a custom View.
     * </p>
     */
    private static class BaseToggleButton extends View {
        private boolean mChecked;

        private CharSequence mTextOn;
        private CharSequence mTextOff;

        private Layout mOnLayout;
        private Layout mOffLayout;

        private TextPaint mTextPaint;

        public BaseToggleButton(Context context, AttributeSet attrs) {
            this(context, attrs, android.R.attr.buttonStyle);
        }

        public BaseToggleButton(Context context, AttributeSet attrs, int defStyle) {
            super(context, attrs, defStyle);

            mTextPaint = new TextPaint(Paint.ANTI_ALIAS_FLAG);

            TypedValue typedValue = new TypedValue();
            context.getTheme().resolveAttribute(android.R.attr.textSize, typedValue, true);
            final int textSize = (int) typedValue.getDimension(
                    context.getResources().getDisplayMetrics());
            mTextPaint.setTextSize(textSize);

            context.getTheme().resolveAttribute(android.R.attr.textColorPrimary, typedValue, true);
            final int textColor = context.getResources().getColor(typedValue.resourceId);
            mTextPaint.setColor(textColor);

            mTextOn = context.getString(R.string.accessibility_custom_on);
            mTextOff = context.getString(R.string.accessibility_custom_off);
        }

        public boolean isChecked() {
            return mChecked;
        }

        public CharSequence getText() {
            return mChecked ? mTextOn : mTextOff;
        }

        @Override
        public boolean performClick() {
            final boolean handled = super.performClick();
            if (!handled) {
                mChecked ^= true;
                invalidate();
            }
            return handled;
        }

        @Override
        public void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            if (mOnLayout == null) {
                mOnLayout = makeLayout(mTextOn);
            }
            if (mOffLayout == null) {
                mOffLayout = makeLayout(mTextOff);
            }
            final int minWidth = Math.max(mOnLayout.getWidth(), mOffLayout.getWidth())
                    + getPaddingLeft() + getPaddingRight();
            final int minHeight = Math.max(mOnLayout.getHeight(), mOffLayout.getHeight())
                    + getPaddingLeft() + getPaddingRight();
            setMeasuredDimension(resolveSizeAndState(minWidth, widthMeasureSpec, 0),
                    resolveSizeAndState(minHeight, heightMeasureSpec, 0));
        }

        private Layout makeLayout(CharSequence text) {
            return new StaticLayout(text, mTextPaint,
                    (int) Math.ceil(Layout.getDesiredWidth(text, mTextPaint)),
                    Layout.Alignment.ALIGN_NORMAL, 1.f, 0, true);
        }

        @Override
        protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            canvas.save();
            canvas.translate(getPaddingLeft(), getPaddingRight());
            Layout switchText = mChecked ? mOnLayout : mOffLayout;
            switchText.draw(canvas);
            canvas.restore();
        }
    }
}
