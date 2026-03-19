import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface S3UploadResponse {
  url: string;
  key: string;
  bucket: string;
}

@Injectable({ providedIn: 'root' })
export class S3UploadService {
  private readonly bucketName = 'synkup-s3-bucket';
  private readonly region = 'ap-south-1';

  /** Read from runtime env (injected via /assets/env.js from server .env). Never commit secrets. */
  private get accessKeyId(): string {
    return (globalThis as unknown as { __env?: { AWS_S3_ACCESS_KEY_ID?: string } }).__env?.AWS_S3_ACCESS_KEY_ID ?? '';
  }

  private get secretAccessKey(): string {
    return (globalThis as unknown as { __env?: { AWS_S3_SECRET_ACCESS_KEY?: string } }).__env?.AWS_S3_SECRET_ACCESS_KEY ?? '';
  }

  /**
   * STANDALONE S3 Upload - No API calls, uploads directly to S3 from frontend
   * 
   * This is a completely standalone script that:
   * - Uses AWS Signature V4 to sign requests
   * - Uploads directly to S3 using fetch (no backend API involved)
   * - Uses credentials from runtime env (AWS_S3_ACCESS_KEY_ID, AWS_S3_SECRET_ACCESS_KEY in .env)
   * - Returns the uploaded file URL
   * 
   * @param file - File to upload
   * @param userType - User type (e.g., 'campus')
   * @returns Observable with uploaded file URL
   */
  uploadFile(file: File, userType: string): Observable<S3UploadResponse> {
    if (!this.accessKeyId || !this.secretAccessKey) {
      return new Observable((observer) => {
        observer.error(new Error(
          'S3 credentials not configured. Add AWS_S3_ACCESS_KEY_ID and AWS_S3_SECRET_ACCESS_KEY to your .env and serve the app via the Node server so /assets/env.js provides them.'
        ));
      });
    }
    const key = `${userType}/${file.name}`;
    
    return new Observable((observer) => {
      this.uploadToS3WithSignature(file, key)
        .then((url) => {
          observer.next({
            url,
            key,
            bucket: this.bucketName,
          });
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  private async uploadToS3WithSignature(file: File, key: string): Promise<string> {
    // URL encode the key for the URL, but use raw key for canonical URI
    const encodedKey = this.encodeS3Key(key);
    const url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${encodedKey}`;
    const now = new Date();
    const dateStamp = this.formatDate(now, 'YYYYMMDD');
    const amzDate = this.formatDate(now, 'YYYYMMDDTHHmmss') + 'Z';
    
    const contentType = file.type || 'application/octet-stream';
    const contentLength = file.size.toString();

    // Step 1: Create canonical request
    // Canonical URI should use the raw key (not URL encoded)
    const canonicalUri = `/${key}`;
    const canonicalQuerystring = '';
    const canonicalHeaders = [
      `content-type:${contentType}`,
      `host:${this.bucketName}.s3.${this.region}.amazonaws.com`,
      `x-amz-date:${amzDate}`,
    ].join('\n') + '\n';
    
    const signedHeaders = 'content-type;host;x-amz-date';
    const payloadHash = await this.sha256(await file.arrayBuffer());
    const canonicalRequest = [
      'PUT',
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    // Step 2: Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest),
    ].join('\n');

    // Step 3: Calculate signature
    const kDate = await this.hmacSha256(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = await this.hmacSha256(this.uint8ArrayToArrayBuffer(kDate), this.region);
    const kService = await this.hmacSha256(this.uint8ArrayToArrayBuffer(kRegion), 's3');
    const kSigning = await this.hmacSha256(this.uint8ArrayToArrayBuffer(kService), 'aws4_request');
    const signature = await this.hmacSha256(this.uint8ArrayToArrayBuffer(kSigning), stringToSign);

    // Step 4: Create authorization header
    const authorization = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${this.hexEncode(signature)}`;

    // Step 5: Upload file directly to S3 (STANDALONE - no API calls)
    // Using XMLHttpRequest which may handle CORS better than fetch
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      
      // Set headers
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('Content-Length', contentLength);
      xhr.setRequestHeader('x-amz-date', amzDate);
      xhr.setRequestHeader('Authorization', authorization);
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(url);
        } else {
          reject(new Error(`S3 upload failed: ${xhr.status} ${xhr.statusText}. ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = () => {
        const currentOrigin = window.location.origin;
        reject(new Error(
          `CORS Error: S3 bucket CORS configuration is required. ` +
          `Current origin: ${currentOrigin}. ` +
          `Please configure CORS on the S3 bucket "synkup-s3-bucket" to allow PUT requests from: ` +
          `http://13.234.201.92:5500 or * (for all origins). ` +
          `Required CORS configuration: AllowOrigin (http://13.234.201.92:5500), AllowMethods (PUT, OPTIONS), AllowHeaders (Content-Type, x-amz-date, Authorization, Content-Length)`
        ));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('S3 upload timeout'));
      };
      
      xhr.timeout = 60000; // 60 seconds timeout
      xhr.send(file);
    });
  }

  private formatDate(date: Date, format: string): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    if (format === 'YYYYMMDD') {
      return `${year}${month}${day}`;
    }
    if (format === 'YYYYMMDDTHHmmss') {
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    }
    return '';
  }

  private async sha256(data: string | ArrayBuffer): Promise<string> {
    const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return this.hexEncode(new Uint8Array(hashBuffer));
  }

  private async hmacSha256(key: string | ArrayBuffer, data: string): Promise<Uint8Array> {
    const keyBuffer = typeof key === 'string' ? new TextEncoder().encode(key).buffer : key;
    const dataBuffer = new TextEncoder().encode(data);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
    return new Uint8Array(signature);
  }

  private uint8ArrayToArrayBuffer(uint8Array: Uint8Array): ArrayBuffer {
    // Create a new ArrayBuffer by copying the bytes to avoid type issues
    const newBuffer = new ArrayBuffer(uint8Array.byteLength);
    const newView = new Uint8Array(newBuffer);
    newView.set(uint8Array);
    return newBuffer;
  }

  private hexEncode(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private encodeS3Key(key: string): string {
    // S3 key encoding: encode special characters but preserve forward slashes
    return key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
  }
}
