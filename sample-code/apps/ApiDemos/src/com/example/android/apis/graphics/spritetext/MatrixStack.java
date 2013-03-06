/*
 * Copyright (C) 2007 The Android Open Source Project
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

package com.example.android.apis.graphics.spritetext;

import android.opengl.Matrix;

import java.nio.FloatBuffer;
import java.nio.IntBuffer;

/**
 * A matrix stack, similar to OpenGL ES's internal matrix stack.
 */
public class MatrixStack {
    public MatrixStack() {
        commonInit(DEFAULT_MAX_DEPTH);
    }

    public MatrixStack(int maxDepth) {
        commonInit(maxDepth);
    }

    private void commonInit(int maxDepth) {
        mMatrix = new float[maxDepth * MATRIX_SIZE];
        mTemp = new float[MATRIX_SIZE * 2];
        glLoadIdentity();
    }

    public void glFrustumf(float left, float right, float bottom, float top,
            float near, float far) {
        Matrix.frustumM(mMatrix, mTop, left, right, bottom, top, near, far);
    }

    public void glFrustumx(int left, int right, int bottom, int top, int near,
            int far) {
        glFrustumf(fixedToFloat(left),fixedToFloat(right),
                fixedToFloat(bottom), fixedToFloat(top),
                fixedToFloat(near), fixedToFloat(far));
    }

    public void glLoadIdentity() {
        Matrix.setIdentityM(mMatrix, mTop);
    }

    public void glLoadMatrixf(float[] m, int offset) {
        System.arraycopy(m, offset, mMatrix, mTop, MATRIX_SIZE);
    }

    public void glLoadMatrixf(FloatBuffer m) {
        m.get(mMatrix, mTop, MATRIX_SIZE);
    }

    public void glLoadMatrixx(int[] m, int offset) {
        for(int i = 0; i < MATRIX_SIZE; i++) {
            mMatrix[mTop + i] = fixedToFloat(m[offset + i]);
        }
    }

    public void glLoadMatrixx(IntBuffer m) {
        for(int i = 0; i < MATRIX_SIZE; i++) {
            mMatrix[mTop + i] = fixedToFloat(m.get());
        }
    }

    public void glMultMatrixf(float[] m, int offset) {
        System.arraycopy(mMatrix, mTop, mTemp, 0, MATRIX_SIZE);
        Matrix.multiplyMM(mMatrix, mTop, mTemp, 0, m, offset);
    }

    public void glMultMatrixf(FloatBuffer m) {
        m.get(mTemp, MATRIX_SIZE, MATRIX_SIZE);
        glMultMatrixf(mTemp, MATRIX_SIZE);
    }

    public void glMultMatrixx(int[] m, int offset) {
        for(int i = 0; i < MATRIX_SIZE; i++) {
            mTemp[MATRIX_SIZE + i] = fixedToFloat(m[offset + i]);
        }
        glMultMatrixf(mTemp, MATRIX_SIZE);
    }

    public void glMultMatrixx(IntBuffer m) {
        for(int i = 0; i < MATRIX_SIZE; i++) {
            mTemp[MATRIX_SIZE + i] = fixedToFloat(m.get());
        }
        glMultMatrixf(mTemp, MATRIX_SIZE);
    }

    public void glOrthof(float left, float right, float bottom, float top,
            float near, float far) {
        Matrix.orthoM(mMatrix, mTop, left, right, bottom, top, near, far);
    }

    public void glOrthox(int left, int right, int bottom, int top, int near,
            int far) {
        glOrthof(fixedToFloat(left), fixedToFloat(right),
                fixedToFloat(bottom), fixedToFloat(top),
                fixedToFloat(near), fixedToFloat(far));
    }

    public void glPopMatrix() {
        preflight_adjust(-1);
        adjust(-1);
    }

    public void glPushMatrix() {
        preflight_adjust(1);
        System.arraycopy(mMatrix, mTop, mMatrix, mTop + MATRIX_SIZE,
                MATRIX_SIZE);
        adjust(1);
    }

    public void glRotatef(float angle, float x, float y, float z) {
        Matrix.setRotateM(mTemp, 0, angle, x, y, z);
        System.arraycopy(mMatrix, mTop, mTemp, MATRIX_SIZE, MATRIX_SIZE);
        Matrix.multiplyMM(mMatrix, mTop, mTemp, MATRIX_SIZE, mTemp, 0);
    }

    public void glRotatex(int angle, int x, int y, int z) {
        glRotatef(angle, fixedToFloat(x), fixedToFloat(y), fixedToFloat(z));
    }

    public void glScalef(float x, float y, float z) {
        Matrix.scaleM(mMatrix, mTop, x, y, z);
    }

    public void glScalex(int x, int y, int z) {
        glScalef(fixedToFloat(x), fixedToFloat(y), fixedToFloat(z));
    }

    public void glTranslatef(float x, float y, float z) {
        Matrix.translateM(mMatrix, mTop, x, y, z);
    }

    public void glTranslatex(int x, int y, int z) {
        glTranslatef(fixedToFloat(x), fixedToFloat(y), fixedToFloat(z));
    }

    public void getMatrix(float[] dest, int offset) {
        System.arraycopy(mMatrix, mTop, dest, offset, MATRIX_SIZE);
    }

    private float fixedToFloat(int x) {
        return x * (1.0f / 65536.0f);
    }

    private void preflight_adjust(int dir) {
        int newTop = mTop + dir * MATRIX_SIZE;
        if (newTop < 0) {
            throw new IllegalArgumentException("stack underflow");
        }
        if (newTop + MATRIX_SIZE > mMatrix.length) {
            throw new IllegalArgumentException("stack overflow");
        }
    }

    private void adjust(int dir) {
        mTop += dir * MATRIX_SIZE;
    }

    private final static int DEFAULT_MAX_DEPTH = 32;
    private final static int MATRIX_SIZE = 16;
    private float[] mMatrix;
    private int mTop;
    private float[] mTemp;
}
