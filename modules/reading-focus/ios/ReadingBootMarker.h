#ifndef DIVERGENTS_READING_BOOT_MARKER_H
#define DIVERGENTS_READING_BOOT_MARKER_H

#include <sys/mman.h>
#include <sys/stat.h>
#include <fcntl.h>

// shm_open is public POSIX API, but Swift cannot call C variadic functions.
// Keep its ABI (including arm64 variadic arguments) in a typed C wrapper.
static inline int ReadingBootMarkerOpen(const char *name) {
  return shm_open(name, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR);
}

#endif
