#include "ruby.h"

typedef unsigned char u8;
typedef unsigned int u32;

static inline void set_best_jr (u8 *start, u8 *d, u8 *jump, u8 *recover)
{
   u8 r;
   *recover = 3;
   u8 *x = start;
   while (x < d-3) {
      if (*x == *d) {
         r = 1;
         while (x[r]==d[r] && x+r<d)
            r++;
         if (r >= *recover) {
            *jump = d - x;
            *recover = r;
         }
      }
      x++;
   }
   return;
}


static inline void write_uncompressed(u8 **buf, u8 d, u8 f)
{
   *((*buf)++) = d;
   if (d == f)
      *((*buf)++) = f;
   return;
}


static inline void write_fjr(u8 **buf, u8 f, u8 j, u8 r)
{
   *((*buf)++) = f;
   *((*buf)++) = (j>=f) ? j+1 : j;
   *((*buf)++) = r;
   return;
}

static inline u8 best_flag(u32 freq[])
{
   u32 min = freq[255];
   u8 flag = 255;
   int i;
   for (i=254; i>=0; i--) {
      if (freq[i]<min) {
         min = freq[i];
         flag = i;
      }
   }
   return flag;
}



static VALUE compress (VALUE self, VALUE rb_dec_str)
{
   u8 *dec, *temp, *lzs;
   u8 *d, *t, *z, *start;
   u32 dsize, tsize, zsize;
   u32 freq[256];
   u8 flag, jump, recover;
   u8 *dend, *tend, *zend;
   VALUE rb_eLZSError;
   
   memset(freq,0,256*sizeof(u32));
   
   /* Estraggo dimensione e puntatore di rb_dec_str,
    * la Ruby String da comprimere. */
   dsize = RSTRING_LEN(rb_dec_str);
   dec = RSTRING_PTR(rb_dec_str);
   
   /* Preparo il primo ciclo di compressione */
   temp = ALLOC_N(u8,2*dsize);
   t = temp;
   d = dec;
   dend = d + dsize;
   
   /* Primo ciclo di compressione */
   while (d < dend) {
      start = (d-dec<255) ? dec : d-254;
      set_best_jr(start,d,&jump,&recover);
      if (recover < 4) {
         write_uncompressed(&t,*d,255);
         freq[*d]++;
         d++;
      }
      else {
         write_fjr(&t,255,jump,recover);
         d += recover;
      }
   }
   
   /* Rialloco il buffer usato nella compressione
    * preliminare, per risparmiare memoria. */
   tend = t;
   tsize = tend-temp;
   temp = REALLOC_N(temp,u8,tsize);
   
   /* Il flag migliore è quello che ha il
    * valore più basso in freq */
   flag = best_flag(freq);
   
   /* Preparo i buffer che userò per la
    * compressione finale */
   zsize = tsize - freq[255] + freq[flag] + 12;
   lzs = ALLOC_N(char,zsize);
   t = temp;
   z = lzs + 12;
   tend = temp + tsize;
   zend = lzs + zsize;
   
   /* I primi 12 byte del buffer lzs compongono l'header */
   *((u32*)lzs+0) = dsize;
   *((u32*)lzs+1) = zsize;
   *((u32*)lzs+2) = (u32)flag;
   
   /* Se il flag è 255, allora la compressione preliminare
    * coincide con quella finale */
   if (flag==255) {
      memmove(z,temp,tsize);
      z += tsize;
   }
   /* Se il flag è diverso, allora scorro il buffer che
    * contiene la compressione temporanea, e scrivo i dati
    * nel nuovo buffer (dopo aver fatto gli opportuni controlli) */
    else {
      while (t<tend) {
         if (*t==255) {
            if (*(t+1)==255) {
               *z++ = 255;
               t += 2;
            }
            else {
               write_fjr(&z, t[0], t[1], t[2]);
               t += 3;
            }
         }
         else {
            write_uncompressed(&z, *t, flag);
            t += 1;
         }
      }
   }
   
   /* Compressione terminata. Libero la memoria, faccio qualche
    * semplice controllo sulla lunghezza dei dati ottenuti,
    * e restituisco la Ruby String contenente i dati compressi. */
   xfree(temp);
   if (z!=zend)
      rb_raise(rb_eLZSError,"An error occurred. Please report the bug at tonypolik@fastwebnet.it");
   VALUE rb_lzs_str = rb_str_new(lzs,zsize);
   xfree(lzs);
   return rb_lzs_str;
}



static VALUE decompress (VALUE self, VALUE rb_lzs_str)
{
   u8 flag, jump, recover;
   u8 *lzs, *dec;
   u8 *z, *d;
   u8 *zend, *dend;
   u32 zsize, dsize;
   VALUE rb_eLZSError;
   
   /* Estraggo dimensione e puntatore di rb_lzs_str,
    * la Ruby String da decomprimere. */
   zsize = RSTRING_LEN(rb_lzs_str);
   lzs = RSTRING_PTR(rb_lzs_str);
   
   /* Estraggo le informazioni dall'header di rb_lzs_str.
    * Nel frattempo, faccio alcuni controlli
    * sulla correttezza dell'header. */
   dsize = ((u32*)lzs)[0];
   if (zsize != ((u32*)lzs)[1])
      rb_raise(rb_eLZSError,"Wrong size of the compressed data. Expected %u, but it's %u",zsize,((u32*)lzs)[1]);
   if (((u32*)lzs)[2] > 255)
      rb_raise(rb_eLZSError,"Flag not valid. Max is 255, but here it is 0x%X",((u32*)lzs)[2]);
   flag = lzs[8];
      
   /* Preparo il buffer per la decompressione */
   dec = ALLOC_N(u8,dsize);
   z = lzs + 12;
   d = dec;
   zend = lzs + zsize;
   dend = dec + dsize;
   
   /* Ciclo di decompressione */
   while (z < zend) {
      if (*z == flag) {
         if (*(z+1) == flag) {
            *d++ = flag;
            z += 2;
         }
         else {
            jump = z[1];
            if (jump>flag) jump--;
            recover = z[2];
            memmove(d,d-jump,recover);
            z += 3;
            d += recover;
         }
      }
      else {
         *d++ = *z;
         z += 1;
      }
   }
   
   /* Decompressione terminata: controllo che la dimensione
    * dei dati decompressi sia quella giusta, libero la memoria
    * e restituisco la Ruby String decompressa. */
   if (dend != d)
      rb_raise(rb_eLZSError,"Wrong size of the decompressed data. Expected %u, but it's %u",dsize,d-dec);
   VALUE rb_dec_str = rb_str_new(dec,dsize);
   xfree(dec);
   return rb_dec_str;
}



void Init_nis_lzs_ext(void)
{
   VALUE rb_mLZS = rb_define_module("LZS");
   VALUE rb_eLZSError = rb_define_class_under(rb_mLZS, "LZSError", rb_eStandardError);
   rb_define_module_function(rb_mLZS,"compress",compress,1);
   rb_define_module_function(rb_mLZS,"decompress",decompress,1);
}