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

package com.example.android.apis.graphics;

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.CharBuffer;
import java.nio.FloatBuffer;

import javax.microedition.khronos.egl.EGLConfig;
import javax.microedition.khronos.opengles.GL;
import javax.microedition.khronos.opengles.GL10;
import javax.microedition.khronos.opengles.GL11;
import javax.microedition.khronos.opengles.GL11Ext;
import javax.microedition.khronos.opengles.GL11ExtensionPack;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.opengl.GLSurfaceView;
import android.opengl.GLU;
import android.opengl.GLUtils;
import android.os.Bundle;
import android.util.Log;

import com.example.android.apis.R;

/**
 * Demonstrate how to use the OES_texture_cube_map extension, available on some
 * high-end OpenGL ES 1.x GPUs.
 */
public class CubeMapActivity extends Activity {
    private GLSurfaceView mGLSurfaceView;
    private class Renderer implements GLSurfaceView.Renderer {
        private boolean mContextSupportsCubeMap;
        private Grid mGrid;
        private int mCubeMapTextureID;
        private boolean mUseTexGen = false;
        private float mAngle;

        public void onDrawFrame(GL10 gl) {
            checkGLError(gl);
            if (mContextSupportsCubeMap) {
                gl.glClearColor(0,0,1,0);
            } else {
                // Current context doesn't support cube maps.
                // Indicate this by drawing a red background.
                gl.glClearColor(1,0,0,0);
            }
            gl.glClear(GL10.GL_COLOR_BUFFER_BIT | GL10.GL_DEPTH_BUFFER_BIT);
            gl.glEnable(GL10.GL_DEPTH_TEST);
            gl.glMatrixMode(GL10.GL_MODELVIEW);
            gl.glLoadIdentity();

            GLU.gluLookAt(gl, 0, 0, -5, 0f, 0f, 0f, 0f, 1.0f, 0.0f);
            gl.glRotatef(mAngle,        0, 1, 0);
            gl.glRotatef(mAngle*0.25f,  1, 0, 0);

            gl.glEnableClientState(GL10.GL_VERTEX_ARRAY);

            checkGLError(gl);

            if (mContextSupportsCubeMap) {
                gl.glActiveTexture(GL10.GL_TEXTURE0);
                checkGLError(gl);
                gl.glEnable(GL11ExtensionPack.GL_TEXTURE_CUBE_MAP);
                checkGLError(gl);
                gl.glBindTexture(GL11ExtensionPack.GL_TEXTURE_CUBE_MAP, mCubeMapTextureID);
                checkGLError(gl);
                GL11ExtensionPack gl11ep = (GL11ExtensionPack) gl;
                gl11ep.glTexGeni(GL11ExtensionPack.GL_TEXTURE_GEN_STR,
                        GL11ExtensionPack.GL_TEXTURE_GEN_MODE,
                        GL11ExtensionPack.GL_REFLECTION_MAP);
                checkGLError(gl);
                gl.glEnable(GL11ExtensionPack.GL_TEXTURE_GEN_STR);
                checkGLError(gl);
                gl.glTexEnvx(GL10.GL_TEXTURE_ENV, GL10.GL_TEXTURE_ENV_MODE, GL10.GL_DECAL);
            }

            checkGLError(gl);
            mGrid.draw(gl);

            if (mContextSupportsCubeMap) {
                gl.glDisable(GL11ExtensionPack.GL_TEXTURE_GEN_STR);
            }
            checkGLError(gl);

            mAngle += 1.2f;
        }

        public void onSurfaceChanged(GL10 gl, int width, int height) {
            checkGLError(gl);
            gl.glViewport(0, 0, width, height);
            float ratio = (float) width / height;
            gl.glMatrixMode(GL10.GL_PROJECTION);
            gl.glLoadIdentity();
            gl.glFrustumf(-ratio, ratio, -1, 1, 1, 10);
            checkGLError(gl);
        }

        public void onSurfaceCreated(GL10 gl, EGLConfig config) {
            checkGLError(gl);
            // This test needs to be done each time a context is created,
            // because different contexts may support different extensions.
            mContextSupportsCubeMap = checkIfContextSupportsCubeMap(gl);

            mGrid = generateTorusGrid(gl, 60, 60, 3.0f, 0.75f);

            if (mContextSupportsCubeMap) {
                int[] cubeMapResourceIds = new int[]{
                        R.raw.skycubemap0, R.raw.skycubemap1, R.raw.skycubemap2,
                        R.raw.skycubemap3, R.raw.skycubemap4, R.raw.skycubemap5};
                mCubeMapTextureID = generateCubeMap(gl, cubeMapResourceIds);
            }
            checkGLError(gl);
        }

        private int generateCubeMap(GL10 gl, int[] resourceIds) {
            checkGLError(gl);
            int[] ids = new int[1];
            gl.glGenTextures(1, ids, 0);
            int cubeMapTextureId = ids[0];
            gl.glBindTexture(GL11ExtensionPack.GL_TEXTURE_CUBE_MAP, cubeMapTextureId);
            gl.glTexParameterf(GL11ExtensionPack.GL_TEXTURE_CUBE_MAP,
                    GL10.GL_TEXTURE_MIN_FILTER, GL10.GL_LINEAR);
            gl.glTexParameterf(GL11ExtensionPack.GL_TEXTURE_CUBE_MAP,
                    GL10.GL_TEXTURE_MAG_FILTER, GL10.GL_LINEAR);

            for (int face = 0; face < 6; face++) {
                InputStream is = getResources().openRawResource(resourceIds[face]);
                Bitmap bitmap;
                try {
                    bitmap = BitmapFactory.decodeStream(is);
                } finally {
                    try {
                        is.close();
                    } catch(IOException e) {
                        Log.e("CubeMap", "Could not decode texture for face " + Integer.toString(face));
                    }
                }
                GLUtils.texImage2D(GL11ExtensionPack.GL_TEXTURE_CUBE_MAP_POSITIVE_X + face, 0,
                        bitmap, 0);
                bitmap.recycle();
            }
            checkGLError(gl);
            return cubeMapTextureId;
        }

        private Grid generateTorusGrid(GL gl, int uSteps, int vSteps, float majorRadius, float minorRadius) {
            Grid grid = new Grid(uSteps + 1, vSteps + 1);
            for (int j = 0; j <= vSteps; j++) {
                double angleV = Math.PI * 2 * j / vSteps;
                float cosV = (float) Math.cos(angleV);
                float sinV = (float) Math.sin(angleV);
                for (int i = 0; i <= uSteps; i++) {
                    double angleU = Math.PI * 2 * i / uSteps;
                    float cosU = (float) Math.cos(angleU);
                    float sinU = (float) Math.sin(angleU);
                    float d = majorRadius+minorRadius*cosU;
                    float x = d*cosV;
                    float y = d*(-sinV);
                    float z = minorRadius * sinU;

                    float nx = cosV * cosU;
                    float ny = -sinV * cosU;
                    float nz = sinU;

                    float length = (float) Math.sqrt(nx*nx + ny*ny + nz*nz);
                    nx /= length;
                    ny /= length;
                    nz /= length;

                    grid.set(i, j, x, y, z, nx, ny, nz);
                }
            }
            grid.createBufferObjects(gl);
            return grid;
        }

        private boolean checkIfContextSupportsCubeMap(GL10 gl) {
            return checkIfContextSupportsExtension(gl, "GL_OES_texture_cube_map");
        }

        /**
         * This is not the fastest way to check for an extension, but fine if
         * we are only checking for a few extensions each time a context is created.
         * @param gl
         * @param extension
         * @return true if the extension is present in the current context.
         */
        private boolean checkIfContextSupportsExtension(GL10 gl, String extension) {
            String extensions = " " + gl.glGetString(GL10.GL_EXTENSIONS) + " ";
            // The extensions string is padded with spaces between extensions, but not
            // necessarily at the beginning or end. For simplicity, add spaces at the
            // beginning and end of the extensions string and the extension string.
            // This means we can avoid special-case checks for the first or last
            // extension, as well as avoid special-case checks when an extension name
            // is the same as the first part of another extension name.
            return extensions.indexOf(" " + extension + " ") >= 0;
        }
    }

    /** A grid is a topologically rectangular array of vertices.
     *
     * This grid class is customized for the vertex data required for this
     * example.
     *
     * The vertex and index data are held in VBO objects because on most
     * GPUs VBO objects are the fastest way of rendering static vertex
     * and index data.
     *
     */

    private static class Grid {
        // Size of vertex data elements in bytes:
        final static int FLOAT_SIZE = 4;
        final static int CHAR_SIZE = 2;

        // Vertex structure:
        // float x, y, z;
        // float nx, ny, nx;

        final static int VERTEX_SIZE = 6 * FLOAT_SIZE;
        final static int VERTEX_NORMAL_BUFFER_INDEX_OFFSET = 3;

        private int mVertexBufferObjectId;
        private int mElementBufferObjectId;

        // These buffers are used to hold the vertex and index data while
        // constructing the grid. Once createBufferObjects() is called
        // the buffers are nulled out to save memory.

        private ByteBuffer mVertexByteBuffer;
        private FloatBuffer mVertexBuffer;
        private CharBuffer mIndexBuffer;

        private int mW;
        private int mH;
        private int mIndexCount;

        public Grid(int w, int h) {
            if (w < 0 || w >= 65536) {
                throw new IllegalArgumentException("w");
            }
            if (h < 0 || h >= 65536) {
                throw new IllegalArgumentException("h");
            }
            if (w * h >= 65536) {
                throw new IllegalArgumentException("w * h >= 65536");
            }

            mW = w;
            mH = h;
            int size = w * h;

            mVertexByteBuffer = ByteBuffer.allocateDirect(VERTEX_SIZE * size)
            .order(ByteOrder.nativeOrder());
            mVertexBuffer = mVertexByteBuffer.asFloatBuffer();

            int quadW = mW - 1;
            int quadH = mH - 1;
            int quadCount = quadW * quadH;
            int indexCount = quadCount * 6;
            mIndexCount = indexCount;
            mIndexBuffer = ByteBuffer.allocateDirect(CHAR_SIZE * indexCount)
            .order(ByteOrder.nativeOrder()).asCharBuffer();

            /*
             * Initialize triangle list mesh.
             *
             *     [0]-----[  1] ...
             *      |    /   |
             *      |   /    |
             *      |  /     |
             *     [w]-----[w+1] ...
             *      |       |
             *
             */

            {
                int i = 0;
                for (int y = 0; y < quadH; y++) {
                    for (int x = 0; x < quadW; x++) {
                        char a = (char) (y * mW + x);
                        char b = (char) (y * mW + x + 1);
                        char c = (char) ((y + 1) * mW + x);
                        char d = (char) ((y + 1) * mW + x + 1);

                        mIndexBuffer.put(i++, a);
                        mIndexBuffer.put(i++, c);
                        mIndexBuffer.put(i++, b);

                        mIndexBuffer.put(i++, b);
                        mIndexBuffer.put(i++, c);
                        mIndexBuffer.put(i++, d);
                    }
                }
            }
        }

        public void set(int i, int j, float x, float y, float z, float nx, float ny, float nz) {
            if (i < 0 || i >= mW) {
                throw new IllegalArgumentException("i");
            }
            if (j < 0 || j >= mH) {
                throw new IllegalArgumentException("j");
            }

            int index = mW * j + i;

            mVertexBuffer.position(index * VERTEX_SIZE / FLOAT_SIZE);
            mVertexBuffer.put(x);
            mVertexBuffer.put(y);
            mVertexBuffer.put(z);
            mVertexBuffer.put(nx);
            mVertexBuffer.put(ny);
            mVertexBuffer.put(nz);
        }

        public void createBufferObjects(GL gl) {
            checkGLError(gl);
            // Generate a the vertex and element buffer IDs
            int[] vboIds = new int[2];
            GL11 gl11 = (GL11) gl;
            gl11.glGenBuffers(2, vboIds, 0);
            mVertexBufferObjectId = vboIds[0];
            mElementBufferObjectId = vboIds[1];

            // Upload the vertex data
            gl11.glBindBuffer(GL11.GL_ARRAY_BUFFER, mVertexBufferObjectId);
            mVertexByteBuffer.position(0);
            gl11.glBufferData(GL11.GL_ARRAY_BUFFER, mVertexByteBuffer.capacity(), mVertexByteBuffer, GL11.GL_STATIC_DRAW);

            gl11.glBindBuffer(GL11.GL_ELEMENT_ARRAY_BUFFER, mElementBufferObjectId);
            mIndexBuffer.position(0);
            gl11.glBufferData(GL11.GL_ELEMENT_ARRAY_BUFFER, mIndexBuffer.capacity() * CHAR_SIZE, mIndexBuffer, GL11.GL_STATIC_DRAW);

            // We don't need the in-memory data any more
            mVertexBuffer = null;
            mVertexByteBuffer = null;
            mIndexBuffer = null;
            checkGLError(gl);
        }

        public void draw(GL10 gl) {
            checkGLError(gl);
            GL11 gl11 = (GL11) gl;

            gl.glEnableClientState(GL10.GL_VERTEX_ARRAY);

            gl11.glBindBuffer(GL11.GL_ARRAY_BUFFER, mVertexBufferObjectId);
            gl11.glVertexPointer(3, GL10.GL_FLOAT, VERTEX_SIZE, 0);

            gl.glEnableClientState(GL10.GL_NORMAL_ARRAY);
            gl11.glNormalPointer(GL10.GL_FLOAT, VERTEX_SIZE, VERTEX_NORMAL_BUFFER_INDEX_OFFSET * FLOAT_SIZE);

            gl11.glBindBuffer(GL11.GL_ELEMENT_ARRAY_BUFFER, mElementBufferObjectId);
            gl11.glDrawElements(GL10.GL_TRIANGLES, mIndexCount, GL10.GL_UNSIGNED_SHORT, 0);
            gl.glDisableClientState(GL10.GL_VERTEX_ARRAY);
            gl.glDisableClientState(GL10.GL_NORMAL_ARRAY);
            gl11.glBindBuffer(GL11.GL_ARRAY_BUFFER, 0);
            gl11.glBindBuffer(GL11.GL_ELEMENT_ARRAY_BUFFER, 0);
            checkGLError(gl);
        }
    }

    static void checkGLError(GL gl) {
        int error = ((GL10) gl).glGetError();
        if (error != GL10.GL_NO_ERROR) {
            throw new RuntimeException("GLError 0x" + Integer.toHexString(error));
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Create our surface view and set it as the content of our
        // Activity
        mGLSurfaceView = new GLSurfaceView(this);
        mGLSurfaceView.setRenderer(new Renderer());
        setContentView(mGLSurfaceView);
    }

    @Override
    protected void onResume() {
        // Ideally a game should implement onResume() and onPause()
        // to take appropriate action when the activity looses focus
        super.onResume();
        mGLSurfaceView.onResume();
    }

    @Override
    protected void onPause() {
        // Ideally a game should implement onResume() and onPause()
        // to take appropriate action when the activity looses focus
        super.onPause();
        mGLSurfaceView.onPause();
    }
}
