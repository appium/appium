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

import com.example.android.apis.R;

import android.app.Activity;
import android.app.Service;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityManager;
import android.view.accessibility.AccessibilityNodeInfo;
import android.view.accessibility.AccessibilityNodeProvider;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * This sample demonstrates how a View can expose a virtual view sub-tree
 * rooted at it. A virtual sub-tree is composed of imaginary Views
 * that are reported as a part of the view hierarchy for accessibility
 * purposes. This enables custom views that draw complex content to report
 * them selves as a tree of virtual views, thus conveying their logical
 * structure.
 * <p>
 * For example, a View may draw a monthly calendar as a grid of days while
 * each such day may contains some events. From a perspective of the View
 * hierarchy the calendar is composed of a single View but an accessibility
 * service would benefit of traversing the logical structure of the calendar
 * by examining each day and each event on that day.
 * </p>
 */
public class AccessibilityNodeProviderActivity extends Activity {
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.accessibility_node_provider);
    }

   /**
    * This class presents a View that is composed of three virtual children
    * each of which is drawn with a different color and represents a region
    * of the View that has different semantics compared to other such regions.
    * While the virtual view tree exposed by this class is one level deep
    * for simplicity, there is no bound on the complexity of that virtual
    * sub-tree.
    */
    public static class VirtualSubtreeRootView extends View {

        /** Paint object for drawing the virtual sub-tree */
        private final Paint mPaint = new Paint();

        /** Temporary rectangle to minimize object creation. */
        private final Rect mTempRect = new Rect();

        /** Handle to the system accessibility service. */
        private final AccessibilityManager mAccessibilityManager;

        /** The virtual children of this View. */
        private final List<VirtualView> mChildren = new ArrayList<VirtualView>();

        /** The instance of the node provider for the virtual tree - lazily instantiated. */
        private AccessibilityNodeProvider mAccessibilityNodeProvider;

        /** The last hovered child used for event dispatching. */
        private VirtualView mLastHoveredChild;

        public VirtualSubtreeRootView(Context context, AttributeSet attrs) {
            super(context, attrs);
            mAccessibilityManager = (AccessibilityManager) context.getSystemService(
                    Service.ACCESSIBILITY_SERVICE);
            createVirtualChildren();
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public AccessibilityNodeProvider getAccessibilityNodeProvider() {
            // Instantiate the provide only when requested. Since the system
            // will call this method multiple times it is a good practice to
            // cache the provider instance.
            if (mAccessibilityNodeProvider == null) {
                mAccessibilityNodeProvider = new VirtualDescendantsProvider();
            }
            return mAccessibilityNodeProvider;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        public boolean dispatchHoverEvent(MotionEvent event) {
            // This implementation assumes that the virtual children
            // cannot overlap and are always visible. Do NOT use this
            // code as a reference of how to implement hover event
            // dispatch. Instead, refer to ViewGroup#dispatchHoverEvent.
            boolean handled = false;
            List<VirtualView> children = mChildren;
            final int childCount = children.size();
            for (int i = 0; i < childCount; i++) {
                VirtualView child = children.get(i);
                Rect childBounds = child.mBounds;
                final int childCoordsX = (int) event.getX() + getScrollX();
                final int childCoordsY = (int) event.getY() + getScrollY();
                if (!childBounds.contains(childCoordsX, childCoordsY)) {
                    continue;
                }
                final int action = event.getAction();
                switch (action) {
                    case MotionEvent.ACTION_HOVER_ENTER: {
                        mLastHoveredChild = child;
                        handled |= onHoverVirtualView(child, event);
                        event.setAction(action);
                    } break;
                    case MotionEvent.ACTION_HOVER_MOVE: {
                        if (child == mLastHoveredChild) {
                            handled |= onHoverVirtualView(child, event);
                            event.setAction(action);
                        } else {
                            MotionEvent eventNoHistory = event.getHistorySize() > 0
                                ? MotionEvent.obtainNoHistory(event) : event;
                            eventNoHistory.setAction(MotionEvent.ACTION_HOVER_EXIT);
                            onHoverVirtualView(mLastHoveredChild, eventNoHistory);
                            eventNoHistory.setAction(MotionEvent.ACTION_HOVER_ENTER);
                            onHoverVirtualView(child, eventNoHistory);
                            mLastHoveredChild = child;
                            eventNoHistory.setAction(MotionEvent.ACTION_HOVER_MOVE);
                            handled |= onHoverVirtualView(child, eventNoHistory);
                            if (eventNoHistory != event) {
                                eventNoHistory.recycle();
                            } else {
                                event.setAction(action);
                            }
                        }
                    } break;
                    case MotionEvent.ACTION_HOVER_EXIT: {
                        mLastHoveredChild = null;
                        handled |= onHoverVirtualView(child, event);
                        event.setAction(action);
                    } break;
                }
            }
            if (!handled) {
                handled |= onHoverEvent(event);
            }
            return handled;
        }

        /**
         * {@inheritDoc}
         */
        @Override
        protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
            // The virtual children are ordered horizontally next to
            // each other and take the entire space of this View.
            int offsetX = 0;
            List<VirtualView> children = mChildren;
            final int childCount = children.size();
            for (int i = 0; i < childCount; i++) {
                VirtualView child = children.get(i);
                Rect childBounds = child.mBounds;
                childBounds.set(offsetX, 0, offsetX + childBounds.width(), childBounds.height());
                offsetX += childBounds.width();
            }
        }

        /**
         * {@inheritDoc}
         */
        @Override
        protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
            // The virtual children are ordered horizontally next to
            // each other and take the entire space of this View.
            int width = 0;
            int height = 0;
            List<VirtualView> children = mChildren;
            final int childCount = children.size();
            for (int i = 0; i < childCount; i++) {
                VirtualView child = children.get(i);
                width += child.mBounds.width();
                height = Math.max(height, child.mBounds.height());
            }
            setMeasuredDimension(width, height);
        }

        /**
         * {@inheritDoc}
         */
        @Override
        protected void onDraw(Canvas canvas) {
            // Draw the virtual children with the reusable Paint object
            // and with the bounds and color which are child specific.
            Rect drawingRect = mTempRect;
            List<VirtualView> children = mChildren;
            final int childCount = children.size();
            for (int i = 0; i < childCount; i++) {
                VirtualView child = children.get(i);
                drawingRect.set(child.mBounds);
                mPaint.setColor(child.mColor);
                mPaint.setAlpha(child.mAlpha);
                canvas.drawRect(drawingRect, mPaint);
            }
        }

        /**
         * Creates the virtual children of this View.
         */
        private void createVirtualChildren() {
            // The virtual portion of the tree is one level deep. Note
            // that implementations can use any way of representing and
            // drawing virtual view.
            VirtualView firstChild = new VirtualView(0, new Rect(0, 0, 150, 150), Color.RED,
                    "Virtual view 1");
            mChildren.add(firstChild);
            VirtualView secondChild = new VirtualView(1, new Rect(0, 0, 150, 150), Color.GREEN,
                    "Virtual view 2");
            mChildren.add(secondChild);
            VirtualView thirdChild = new VirtualView(2, new Rect(0, 0, 150, 150), Color.BLUE,
                    "Virtual view 3");
            mChildren.add(thirdChild);
        }

        /**
         * Set the selected state of a virtual view.
         *
         * @param virtualView The virtual view whose selected state to set.
         * @param selected Whether the virtual view is selected.
         */
        private void setVirtualViewSelected(VirtualView virtualView, boolean selected) {
            virtualView.mAlpha = selected ? VirtualView.ALPHA_SELECTED : VirtualView.ALPHA_NOT_SELECTED;
        }

        /**
         * Handle a hover over a virtual view.
         *
         * @param virtualView The virtual view over which is hovered.
         * @param event The event to dispatch.
         * @return Whether the event was handled.
         */
        private boolean onHoverVirtualView(VirtualView virtualView, MotionEvent event) {
            // The implementation of hover event dispatch can be implemented
            // in any way that is found suitable. However, each virtual View
            // should fire a corresponding accessibility event whose source
            // is that virtual view. Accessibility services get the event source
            // as the entry point of the APIs for querying the window content.
            final int action = event.getAction();
            switch (action) {
                case MotionEvent.ACTION_HOVER_ENTER: {
                    sendAccessibilityEventForVirtualView(virtualView,
                            AccessibilityEvent.TYPE_VIEW_HOVER_ENTER);
                } break;
                case MotionEvent.ACTION_HOVER_EXIT: {
                    sendAccessibilityEventForVirtualView(virtualView,
                            AccessibilityEvent.TYPE_VIEW_HOVER_EXIT);
                } break;
            }
            return true;
        }

        /**
         * Sends a properly initialized accessibility event for a virtual view..
         *
         * @param virtualView The virtual view.
         * @param eventType The type of the event to send.
         */
        private void sendAccessibilityEventForVirtualView(VirtualView virtualView, int eventType) {
            // If touch exploration, i.e. the user gets feedback while touching
            // the screen, is enabled we fire accessibility events.
            if (mAccessibilityManager.isTouchExplorationEnabled()) {
                AccessibilityEvent event = AccessibilityEvent.obtain(eventType);
                event.setPackageName(getContext().getPackageName());
                event.setClassName(virtualView.getClass().getName());
                event.setSource(VirtualSubtreeRootView.this, virtualView.mId);
                event.getText().add(virtualView.mText);
                getParent().requestSendAccessibilityEvent(VirtualSubtreeRootView.this, event);
            }
        }

        /**
         * Finds a virtual view given its id.
         *
         * @param id The virtual view id.
         * @return The found virtual view.
         */
        private VirtualView findVirtualViewById(int id) {
            List<VirtualView> children = mChildren;
            final int childCount = children.size();
            for (int i = 0; i < childCount; i++) {
                VirtualView child = children.get(i);
                if (child.mId == id) {
                    return child;
                }
            }
            return null;
        }

        /**
         * Represents a virtual View.
         */
        private class VirtualView {
            public static final int ALPHA_SELECTED = 255;
            public static final int ALPHA_NOT_SELECTED = 127;

            public final int mId;
            public final int mColor;
            public final Rect mBounds;
            public final String mText;
            public int mAlpha;

            public VirtualView(int id, Rect bounds, int color, String text) {
                mId = id;
                mColor = color;
                mBounds = bounds;
                mText = text;
                mAlpha = ALPHA_NOT_SELECTED;
            }
        }

        /**
         * This is the provider that exposes the virtual View tree to accessibility
         * services. From the perspective of an accessibility service the
         * {@link AccessibilityNodeInfo}s it receives while exploring the sub-tree
         * rooted at this View will be the same as the ones it received while
         * exploring a View containing a sub-tree composed of real Views.
         */
        private class VirtualDescendantsProvider extends AccessibilityNodeProvider {

            /**
             * {@inheritDoc}
             */
            @Override
            public AccessibilityNodeInfo createAccessibilityNodeInfo(int virtualViewId) {
                AccessibilityNodeInfo info = null;
                if (virtualViewId == View.NO_ID) {
                    // We are requested to create an AccessibilityNodeInfo describing
                    // this View, i.e. the root of the virtual sub-tree. Note that the
                    // host View has an AccessibilityNodeProvider which means that this
                    // provider is responsible for creating the node info for that root.
                    info = AccessibilityNodeInfo.obtain(VirtualSubtreeRootView.this);
                    onInitializeAccessibilityNodeInfo(info);
                    // Add the virtual children of the root View.
                    List<VirtualView> children = mChildren;
                    final int childCount = children.size();
                    for (int i = 0; i < childCount; i++) {
                        VirtualView child = children.get(i);
                        info.addChild(VirtualSubtreeRootView.this, child.mId);
                    }
                } else {
                    // Find the view that corresponds to the given id.
                    VirtualView virtualView = findVirtualViewById(virtualViewId);
                    if (virtualView == null) {
                        return null;
                    }
                    // Obtain and initialize an AccessibilityNodeInfo with
                    // information about the virtual view.
                    info = AccessibilityNodeInfo.obtain();
                    info.addAction(AccessibilityNodeInfo.ACTION_SELECT);
                    info.addAction(AccessibilityNodeInfo.ACTION_CLEAR_SELECTION);
                    info.setPackageName(getContext().getPackageName());
                    info.setClassName(virtualView.getClass().getName());
                    info.setSource(VirtualSubtreeRootView.this, virtualViewId);
                    info.setBoundsInParent(virtualView.mBounds);
                    info.setParent(VirtualSubtreeRootView.this);
                    info.setText(virtualView.mText);
                }
                return info;
            }

            /**
             * {@inheritDoc}
             */
            @Override
            public List<AccessibilityNodeInfo> findAccessibilityNodeInfosByText(String searched,
                    int virtualViewId) {
                if (TextUtils.isEmpty(searched)) {
                    return Collections.emptyList();
                }
                String searchedLowerCase = searched.toLowerCase();
                List<AccessibilityNodeInfo> result = null;
                if (virtualViewId == View.NO_ID) {
                    // If the search is from the root, i.e. this View, go over the virtual
                    // children and look for ones that contain the searched string since
                    // this View does not contain text itself.
                    List<VirtualView> children = mChildren;
                    final int childCount = children.size();
                    for (int i = 0; i < childCount; i++) {
                        VirtualView child = children.get(i);
                        String textToLowerCase = child.mText.toLowerCase();
                        if (textToLowerCase.contains(searchedLowerCase)) {
                            if (result == null) {
                                result = new ArrayList<AccessibilityNodeInfo>();
                            }
                            result.add(createAccessibilityNodeInfo(child.mId));
                        }
                    }
                } else {
                    // If the search is from a virtual view, find the view. Since the tree
                    // is one level deep we add a node info for the child to the result if
                    // the child contains the searched text.
                    VirtualView virtualView = findVirtualViewById(virtualViewId);
                    if (virtualView != null) {
                        String textToLowerCase = virtualView.mText.toLowerCase();
                        if (textToLowerCase.contains(searchedLowerCase)) {
                            result = new ArrayList<AccessibilityNodeInfo>();
                            result.add(createAccessibilityNodeInfo(virtualViewId));
                        }
                    }
                }
                if (result == null) {
                    return Collections.emptyList();
                }
                return result;
            }

            /**
             * {@inheritDoc}
             */
            @Override
            public boolean performAction(int virtualViewId, int action, Bundle arguments) {
                if (virtualViewId == View.NO_ID) {
                    // Perform the action on the host View.
                    switch (action) {
                        case AccessibilityNodeInfo.ACTION_SELECT:
                            if (!isSelected()) {
                                setSelected(true);
                                return isSelected();
                            }
                            break;
                        case AccessibilityNodeInfo.ACTION_CLEAR_SELECTION:
                            if (isSelected()) {
                                setSelected(false);
                                return !isSelected();
                            }
                            break;
                    }
                } else {
                    // Find the view that corresponds to the given id.
                    VirtualView child = findVirtualViewById(virtualViewId);
                    if (child == null) {
                        return false;
                    }
                    // Perform the action on a virtual view.
                    switch (action) {
                        case AccessibilityNodeInfo.ACTION_SELECT:
                            setVirtualViewSelected(child, true);
                            invalidate();
                            return true;
                        case AccessibilityNodeInfo.ACTION_CLEAR_SELECTION:
                            setVirtualViewSelected(child, false);
                            invalidate();
                            return true;
                    }
                }
                return false;
            }
        }
    }
}
