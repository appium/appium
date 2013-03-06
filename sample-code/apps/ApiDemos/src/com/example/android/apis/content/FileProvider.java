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

package com.example.android.apis.content;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.ContentProvider.PipeDataWriter;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.util.Log;

/**
 * A very simple content provider that can serve arbitrary asset files from
 * our .apk.
 */
public class FileProvider extends ContentProvider
        implements PipeDataWriter<InputStream> {
    @Override
    public boolean onCreate() {
        return true;
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs,
            String sortOrder) {
        // Don't support queries.
        return null;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        // Don't support inserts.
        return null;
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        // Don't support deletes.
        return 0;
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        // Don't support updates.
        return 0;
    }

    @Override
    public String getType(Uri uri) {
        // For this sample, assume all files are .apks.
        return "application/vnd.android.package-archive";
    }

    @Override
    public AssetFileDescriptor openAssetFile(Uri uri, String mode) throws FileNotFoundException {
        // Try to open an asset with the given name.
        try {
            InputStream is = getContext().getAssets().open(uri.getPath());
            // Start a new thread that pipes the stream data back to the caller.
            return new AssetFileDescriptor(
                    openPipeHelper(uri, null, null, is, this), 0,
                    AssetFileDescriptor.UNKNOWN_LENGTH);
        } catch (IOException e) {
            FileNotFoundException fnf = new FileNotFoundException("Unable to open " + uri);
            throw fnf;
        }
    }

    @Override
    public void writeDataToPipe(ParcelFileDescriptor output, Uri uri, String mimeType,
            Bundle opts, InputStream args) {
        // Transfer data from the asset to the pipe the client is reading.
        byte[] buffer = new byte[8192];
        int n;
        FileOutputStream fout = new FileOutputStream(output.getFileDescriptor());
        try {
            while ((n=args.read(buffer)) >= 0) {
                fout.write(buffer, 0, n);
            }
        } catch (IOException e) {
            Log.i("InstallApk", "Failed transferring", e);
        } finally {
            try {
                args.close();
            } catch (IOException e) {
            }
            try {
                fout.close();
            } catch (IOException e) {
            }
        }
    }
}
