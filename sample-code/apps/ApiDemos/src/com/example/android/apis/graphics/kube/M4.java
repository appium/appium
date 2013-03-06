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

/** 
 * 
 * A 4x4 float matrix
 *
 */
public class M4 {
	public float[][] m = new float[4][4];
	
	public M4() {
	}
	
	public M4(M4 other) {
		for (int i = 0; i < 4; i++) {
			for (int j = 0; j < 4; j++) {
				m[i][j] = other.m[i][j];
			}
		}		
	}

	public void multiply(GLVertex src, GLVertex dest) {
		dest.x = src.x * m[0][0] + src.y * m[1][0] + src.z * m[2][0] + m[3][0];
		dest.y = src.x * m[0][1] + src.y * m[1][1] + src.z * m[2][1] + m[3][1];
		dest.z = src.x * m[0][2] + src.y * m[1][2] + src.z * m[2][2] + m[3][2];
	}
	
	public M4 multiply(M4 other) {
		M4 result = new M4();
		float[][] m1 = m;
		float[][] m2 = other.m;
		
		for (int i = 0; i < 4; i++) {
			for (int j = 0; j < 4; j++) {
				result.m[i][j] = m1[i][0]*m2[0][j] + m1[i][1]*m2[1][j] + m1[i][2]*m2[2][j] + m1[i][3]*m2[3][j];
			}
		}
		
		return result;
	}
	
	public void setIdentity() {
		for (int i = 0; i < 4; i++) {
			for (int j = 0; j < 4; j++) {
				m[i][j] = (i == j ? 1f : 0f);
			}
		}
	}
	
	@Override
	public String toString() {
		StringBuilder builder = new StringBuilder("[ ");
		for (int i = 0; i < 4; i++) {
			for (int j = 0; j < 4; j++) {
				builder.append(m[i][j]);
				builder.append(" ");
			}
			if (i < 2)
				builder.append("\n  ");
		}
		builder.append(" ]");
		return builder.toString();
	}
}
