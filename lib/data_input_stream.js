/*!
 * node-hbase-client - lib/data_input_stream.js
 * Copyright(c) 2013 fengmk2 <fengmk2@gmail.com>
 * MIT Licensed
 */

"use strict";

/**
 * Module dependencies.
 */

var Bytes = require('./util/bytes');
var WritableUtils = require('./writable_utils');

var helpers = {
  readString: WritableUtils.readString,
  readByteArray: Bytes.readByteArray,
};

function DataInputStream(io) {
  this.in = io;
  this.bytearr = new Buffer(80);
}

DataInputStream.prototype = {

  /**
   * working arrays initialized on demand by readUTF
   */
  // private byte bytearr[] = new byte[80];
  // private char chararr[] = new char[80];

  /**
   * Reads some number of bytes from the contained input stream and 
   * stores them into the buffer array <code>b</code>. The number of 
   * bytes actually read is returned as an integer. This method blocks 
   * until input data is available, end of file is detected, or an 
   * exception is thrown. 
   * 
   * <p>If <code>b</code> is null, a <code>NullPointerException</code> is 
   * thrown. If the length of <code>b</code> is zero, then no bytes are 
   * read and <code>0</code> is returned; otherwise, there is an attempt 
   * to read at least one byte. If no byte is available because the 
   * stream is at end of file, the value <code>-1</code> is returned;
   * otherwise, at least one byte is read and stored into <code>b</code>. 
   * 
   * <p>The first byte read is stored into element <code>b[0]</code>, the 
   * next one into <code>b[1]</code>, and so on. The number of bytes read 
   * is, at most, equal to the length of <code>b</code>. Let <code>k</code> 
   * be the number of bytes actually read; these bytes will be stored in 
   * elements <code>b[0]</code> through <code>b[k-1]</code>, leaving 
   * elements <code>b[k]</code> through <code>b[b.length-1]</code> 
   * unaffected. 
   * 
   * <p>The <code>read(b)</code> method has the same effect as: 
   * <blockquote><pre>
   * read(b, 0, b.length) 
   * </pre></blockquote>
   *
   * @param      b   the buffer into which the data is read.
   * @return     the total number of bytes read into the buffer, or
   *             <code>-1</code> if there is no more data because the end
   *             of the stream has been reached.
   * @exception  IOException if the first byte cannot be read for any reason
   * other than end of file, the stream has been closed and the underlying
   * input stream does not support reading after close, or another I/O
   * error occurs.
   * @see        java.io.FilterInputStream#in
   * @see        java.io.InputStream#read(byte[], int, int)
   */
  read: function (b, callback) {
    return this.in.read(b, 0, b.length);
  },

  readBytes: function (size, callback) {
    var buf = this.in.read(size);
    if (buf === null) {
      return this.in.once('readable', this.readBytes.bind(this, size, callback));
    }
    callback(null, buf);
  },

  readFields: function (fields, callback, startIndex) {
    var self = this;
    var lastError = null;
    var data = {};
    var next = function (index) {
      if (index === fields.length) {
        return callback(lastError, data);
      }
      var field = fields[index];
      var nextIndex = index + 1;
      var helperFun = helpers[field.method];
      if (helperFun) {
        helperFun(self, function (err, value) {
          if (err) {
            lastError = err;
          }
          data[field.name] = value;
          next(nextIndex);
        });
        return;
      }

      var value = self[field.method]();
      if (value === null) {
        return self.in.once('readable', self.readFields.bind(self, fields, callback, index));
      }
      data[field.name] = value;
      next(nextIndex);
    };
    startIndex = startIndex || 0;
    next(startIndex);
  },

  readIteration: function (iterator, callback) {
    var self = this;
    self.readFields([{name: 'num', method: 'readInt'}], function (err, data) {
      if (err) {
        return callback(err);
      }
      var num = data.num;
      if (num === 0) {
        return callback(null, []);
      }
      var items = [];
      var lastError = null;
      var next = function () {
        if (num === 0) {
          return callback(lastError, items);
        }
        num--;
        iterator(function (err, item) {
          if (err) {
            lastError = err;
          }
          if (item !== undefined) {
            items.push(item);
          }
          next();
        });
      };
      next();
    });
  },

  /**
   * See the general contract of the <code>readFully</code>
   * method of <code>DataInput</code>.
   * <p>
   * Bytes
   * for this operation are read from the contained
   * input stream.
   *
   * @param      b     the buffer into which the data is read.
   * @param      off   the start offset of the data.
   * @param      len   the number of bytes to read.
   * @exception  EOFException  if this input stream reaches the end before
   *               reading all the bytes.
   * @exception  IOException   the stream has been closed and the contained
   *       input stream does not support reading after close, or
   *       another I/O error occurs.
   * @see        java.io.FilterInputStream#in
   */
  readFully: function (len, callback) {
    var buf = this.in.read(len);
    if (buf === null) {
      return this.in.once('readable', this.readFully.bind(this, len, callback));
    }
    callback(null, buf);
  },

//   /**
//    * See the general contract of the <code>skipBytes</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes for this operation are read from the contained
//    * input stream.
//    *
//    * @param      n   the number of bytes to be skipped.
//    * @return     the actual number of bytes skipped.
//    * @exception  IOException  if the contained input stream does not support
//    *       seek, or the stream has been closed and
//    *       the contained input stream does not support 
//    *       reading after close, or another I/O error occurs.
//    */
//   public final int skipBytes(int n) throws IOException {
// int total = 0;
// int cur = 0;

// while ((total<n) && ((cur = (int) in.skip(n-total)) > 0)) {
//     total += cur;
// }

// return total;
//   }

  /**
   * See the general contract of the <code>readBoolean</code>
   * method of <code>DataInput</code>.
   * <p>
   * Bytes for this operation are read from the contained
   * input stream.
   *
   * @return     the <code>boolean</code> value read.
   * @exception  EOFException  if this input stream has reached the end.
   * @exception  IOException   the stream has been closed and the contained
   *       input stream does not support reading after close, or
   *       another I/O error occurs.
   * @see        java.io.FilterInputStream#in
   */
  readBoolean: function () {
    var buf = this.in.read(1);
    return buf ? buf[0] !== 0 : null;
  },

  /**
   * See the general contract of the <code>readByte</code>
   * method of <code>DataInput</code>.
   * <p>
   * Bytes
   * for this operation are read from the contained
   * input stream.
   *
   * @return     the next byte of this input stream as a signed 8-bit
   *             <code>byte</code>.
   * @exception  EOFException  if this input stream has reached the end.
   * @exception  IOException   the stream has been closed and the contained
   *       input stream does not support reading after close, or
   *       another I/O error occurs.
   * @see        java.io.FilterInputStream#in
   */
  readByte: function () {
    var buf = this.in.read(1);
    return buf ? buf.readInt8(0) : null;
  },

//   /**
//    * See the general contract of the <code>readUnsignedByte</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @return     the next byte of this input stream, interpreted as an
//    *             unsigned 8-bit number.
//    * @exception  EOFException  if this input stream has reached the end.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @see         java.io.FilterInputStream#in
//    */
//   public final int readUnsignedByte() throws IOException {
// int ch = in.read();
// if (ch < 0)
//     throw new EOFException();
// return ch;
//   }

//   /**
//    * See the general contract of the <code>readShort</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @return     the next two bytes of this input stream, interpreted as a
//    *             signed 16-bit number.
//    * @exception  EOFException  if this input stream reaches the end before
//    *               reading two bytes.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @see        java.io.FilterInputStream#in
//    */
//   public final short readShort() throws IOException {
//       int ch1 = in.read();
//       int ch2 = in.read();
//       if ((ch1 | ch2) < 0)
//           throw new EOFException();
//       return (short)((ch1 << 8) + (ch2 << 0));
//   }

//   /**
//    * See the general contract of the <code>readUnsignedShort</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @return     the next two bytes of this input stream, interpreted as an
//    *             unsigned 16-bit integer.
//    * @exception  EOFException  if this input stream reaches the end before
//    *             reading two bytes.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @see        java.io.FilterInputStream#in
//    */
//   public final int readUnsignedShort() throws IOException {
//       int ch1 = in.read();
//       int ch2 = in.read();
//       if ((ch1 | ch2) < 0)
//           throw new EOFException();
//       return (ch1 << 8) + (ch2 << 0);
//   }

//   /**
//    * See the general contract of the <code>readChar</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @return     the next two bytes of this input stream, interpreted as a
//    *       <code>char</code>.
//    * @exception  EOFException  if this input stream reaches the end before
//    *               reading two bytes.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @see        java.io.FilterInputStream#in
//    */
//   public final char readChar() throws IOException {
//       int ch1 = in.read();
//       int ch2 = in.read();
//       if ((ch1 | ch2) < 0)
//           throw new EOFException();
//       return (char)((ch1 << 8) + (ch2 << 0));
//   }

  /**
   * See the general contract of the <code>readInt</code>
   * method of <code>DataInput</code>.
   * <p>
   * Bytes
   * for this operation are read from the contained
   * input stream.
   *
   * @return     the next four bytes of this input stream, interpreted as an
   *             <code>int</code>.
   * @exception  EOFException  if this input stream reaches the end before
   *               reading four bytes.
   * @exception  IOException   the stream has been closed and the contained
   *       input stream does not support reading after close, or
   *       another I/O error occurs.
   * @see        java.io.FilterInputStream#in
   */
  readInt: function () {
    var buf = this.in.read(4);
    return buf ? buf.readInt32BE(0) : null;
  },

  /**
   * See the general contract of the <code>readLong</code>
   * method of <code>DataInput</code>.
   * <p>
   * Bytes
   * for this operation are read from the contained
   * input stream.
   *
   * @return     the next eight bytes of this input stream, interpreted as a
   *             <code>long</code>.
   * @exception  EOFException  if this input stream reaches the end before
   *               reading eight bytes.
   * @exception  IOException   the stream has been closed and the contained
   *       input stream does not support reading after close, or
   *       another I/O error occurs.
   * @see        java.io.FilterInputStream#in
   */
  readLong: function () {
    var buf = this.in.read(8);
    if (buf === null) {
      return buf;
    }
    return WritableUtils.toLong(buf);
  },

//   /**
//    * See the general contract of the <code>readFloat</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @return     the next four bytes of this input stream, interpreted as a
//    *             <code>float</code>.
//    * @exception  EOFException  if this input stream reaches the end before
//    *               reading four bytes.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @see        java.io.DataInputStream#readInt()
//    * @see        java.lang.Float#intBitsToFloat(int)
//    */
//   public final float readFloat() throws IOException {
// return Float.intBitsToFloat(readInt());
//   }

//   /**
//    * See the general contract of the <code>readDouble</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @return     the next eight bytes of this input stream, interpreted as a
//    *             <code>double</code>.
//    * @exception  EOFException  if this input stream reaches the end before
//    *               reading eight bytes.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @see        java.io.DataInputStream#readLong()
//    * @see        java.lang.Double#longBitsToDouble(long)
//    */
//   public final double readDouble() throws IOException {
// return Double.longBitsToDouble(readLong());
//   }

//   private char lineBuffer[];

//   /**
//    * See the general contract of the <code>readLine</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @deprecated This method does not properly convert bytes to characters.
//    * As of JDK&nbsp;1.1, the preferred way to read lines of text is via the
//    * <code>BufferedReader.readLine()</code> method.  Programs that use the
//    * <code>DataInputStream</code> class to read lines can be converted to use
//    * the <code>BufferedReader</code> class by replacing code of the form:
//    * <blockquote><pre>
//    *     DataInputStream d =&nbsp;new&nbsp;DataInputStream(in);
//    * </pre></blockquote>
//    * with:
//    * <blockquote><pre>
//    *     BufferedReader d
//    *          =&nbsp;new&nbsp;BufferedReader(new&nbsp;InputStreamReader(in));
//    * </pre></blockquote>
//    *
//    * @return     the next line of text from this input stream.
//    * @exception  IOException  if an I/O error occurs.
//    * @see        java.io.BufferedReader#readLine()
//    * @see        java.io.FilterInputStream#in
//    */
//   @Deprecated
//   public final String readLine() throws IOException {
// char buf[] = lineBuffer;

// if (buf == null) {
//     buf = lineBuffer = new char[128];
// }

// int room = buf.length;
// int offset = 0;
// int c;

// loop: while (true) {
//     switch (c = in.read()) {
//       case -1:
//       case '\n':
//   break loop;

//       case '\r':
//   int c2 = in.read();
//   if ((c2 != '\n') && (c2 != -1)) {
//       if (!(in instanceof PushbackInputStream)) {
//     this.in = new PushbackInputStream(in);
//       }
//       ((PushbackInputStream)in).unread(c2);
//   }
//   break loop;

//       default:
//   if (--room < 0) {
//       buf = new char[offset + 128];
//       room = buf.length - offset - 1;
//       System.arraycopy(lineBuffer, 0, buf, 0, offset);
//       lineBuffer = buf;
//   }
//   buf[offset++] = (char) c;
//   break;
//     }
// }
// if ((c == -1) && (offset == 0)) {
//     return null;
// }
// return String.copyValueOf(buf, 0, offset);
//   }

//   /**
//    * See the general contract of the <code>readUTF</code>
//    * method of <code>DataInput</code>.
//    * <p>
//    * Bytes
//    * for this operation are read from the contained
//    * input stream.
//    *
//    * @return     a Unicode string.
//    * @exception  EOFException  if this input stream reaches the end before
//    *               reading all the bytes.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @exception  UTFDataFormatException if the bytes do not represent a valid
//    *             modified UTF-8 encoding of a string.
//    * @see        java.io.DataInputStream#readUTF(java.io.DataInput)
//    */
//   public final String readUTF() throws IOException {
//       return readUTF(this);
//   }

//   /**
//    * Reads from the
//    * stream <code>in</code> a representation
//    * of a Unicode  character string encoded in
//    * <a href="DataInput.html#modified-utf-8">modified UTF-8</a> format;
//    * this string of characters is then returned as a <code>String</code>.
//    * The details of the modified UTF-8 representation
//    * are  exactly the same as for the <code>readUTF</code>
//    * method of <code>DataInput</code>.
//    *
//    * @param      in   a data input stream.
//    * @return     a Unicode string.
//    * @exception  EOFException            if the input stream reaches the end
//    *               before all the bytes.
//    * @exception  IOException   the stream has been closed and the contained
//    *       input stream does not support reading after close, or
//    *       another I/O error occurs.
//    * @exception  UTFDataFormatException  if the bytes do not represent a
//    *               valid modified UTF-8 encoding of a Unicode string.
//    * @see        java.io.DataInputStream#readUnsignedShort()
//    */
//   public final static String readUTF(DataInput in) throws IOException {
//       int utflen = in.readUnsignedShort();
//       byte[] bytearr = null;
//       char[] chararr = null;
//       if (in instanceof DataInputStream) {
//           DataInputStream dis = (DataInputStream)in;
//           if (dis.bytearr.length < utflen){
//               dis.bytearr = new byte[utflen*2];
//               dis.chararr = new char[utflen*2];
//           }
//           chararr = dis.chararr;
//           bytearr = dis.bytearr;
//       } else {
//           bytearr = new byte[utflen];
//           chararr = new char[utflen];
//       }

//       int c, char2, char3;
//       int count = 0;
//       int chararr_count=0;

//       in.readFully(bytearr, 0, utflen);

//       while (count < utflen) {
//           c = (int) bytearr[count] & 0xff;      
//           if (c > 127) break;
//           count++;
//           chararr[chararr_count++]=(char)c;
//       }

//       while (count < utflen) {
//           c = (int) bytearr[count] & 0xff;
//           switch (c >> 4) {
//               case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
//                   /* 0xxxxxxx*/
//                   count++;
//                   chararr[chararr_count++]=(char)c;
//                   break;
//               case 12: case 13:
//                   /* 110x xxxx   10xx xxxx*/
//                   count += 2;
//                   if (count > utflen)
//                       throw new UTFDataFormatException(
//                           "malformed input: partial character at end");
//                   char2 = (int) bytearr[count-1];
//                   if ((char2 & 0xC0) != 0x80)
//                       throw new UTFDataFormatException(
//                           "malformed input around byte " + count); 
//                   chararr[chararr_count++]=(char)(((c & 0x1F) << 6) | 
//                                                   (char2 & 0x3F));  
//                   break;
//               case 14:
//                   /* 1110 xxxx  10xx xxxx  10xx xxxx */
//                   count += 3;
//                   if (count > utflen)
//                       throw new UTFDataFormatException(
//                           "malformed input: partial character at end");
//                   char2 = (int) bytearr[count-2];
//                   char3 = (int) bytearr[count-1];
//                   if (((char2 & 0xC0) != 0x80) || ((char3 & 0xC0) != 0x80))
//                       throw new UTFDataFormatException(
//                           "malformed input around byte " + (count-1));
//                   chararr[chararr_count++]=(char)(((c     & 0x0F) << 12) |
//                                                   ((char2 & 0x3F) << 6)  |
//                                                   ((char3 & 0x3F) << 0));
//                   break;
//               default:
//                   /* 10xx xxxx,  1111 xxxx */
//                   throw new UTFDataFormatException(
//                       "malformed input around byte " + count);
//           }
//       }
//       // The number of chars produced may be less than utflen
//       return new String(chararr, 0, chararr_count);
//   }

};

module.exports = DataInputStream;