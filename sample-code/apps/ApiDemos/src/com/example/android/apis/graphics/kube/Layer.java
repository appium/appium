/*
 * Copyright (C) 2008 The Android Open Source Project
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

package com.example.android.apis.graphics.kube;

public class Layer {
	
	public Layer(int axis) {
		// start with identity matrix for transformation
		mAxis = axis;
		mTransform.setIdentity();
	}
	
	public void startAnimation() {
		for (int i = 0; i < mShapes.length; i++) {
			GLShape shape = mShapes[i];
			if (shape != null) {
				shape.startAnimation();
			}	
		}
	}

	public void endAnimation() {
		for (int i = 0; i < mShapes.length; i++) {
			GLShape shape = mShapes[i];
			if (shape != null) {
				shape.endAnimation();
			}	
		}
	}
	
	public void setAngle(float angle) {
		// normalize the angle
		float twopi = (float)Math.PI *2f;
		while (angle >= twopi) angle -= twopi;
		while (angle < 0f) angle += twopi;
//		mAngle = angle;
		
		float sin = (float)Math.sin(angle);
		float cos = (float)Math.cos(angle);
		
		float[][] m = mTransform.m;
		switch (mAxis) {
			case kAxisX:
				m[1][1] = cos;
				m[1][2] = sin;
				m[2][1] = -sin;
				m[2][2] = cos;
				m[0][0] = 1f;
				m[0][1] = m[0][2] = m[1][0] = m[2][0] = 0f;
				break;
			case kAxisY:
				m[0][0] = cos;
				m[0][2] = sin;
				m[2][0] = -sin;
				m[2][2] = cos;
				m[1][1] = 1f;
				m[0][1] = m[1][0] = m[1][2] = m[2][1] = 0f;
				break;
			case kAxisZ:
				m[0][0] = cos;
				m[0][1] = sin;
				m[1][0] = -sin;
				m[1][1] = cos;
				m[2][2] = 1f;
				m[2][0] = m[2][1] = m[0][2] = m[1][2] = 0f;
				break;
		}
		
		for (int i = 0; i < mShapes.length; i++) {
			GLShape shape = mShapes[i];
			if (shape != null) {
				shape.animateTransform(mTransform);
			}
		}
	}
	
	GLShape[] mShapes = new GLShape[9];
	M4 mTransform = new M4();
//	float mAngle;

	// which axis do we rotate around?
	// 0 for X, 1 for Y, 2 for Z
	int mAxis;
	static public final int kAxisX = 0;
	static public final int kAxisY = 1;
	static public final int kAxisZ = 2;	
}
