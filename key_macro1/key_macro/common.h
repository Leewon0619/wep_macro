#pragma once

#define EX_KEY_MACRO_ITSELF	0x00010000

template <typename T>
T BOUND (T value, T lo, T hi)
{
	if (value < lo) value = lo;
	if (value > hi) value = hi;
	return value;
}

inline int ROUND (double x)
{
	if (x > 0.) return (int)(x + 0.5);
	if (x < 0.) return (int)(x - 0.5);
	return 0;
}


extern BYTE MouseButton2VkCode (long flags, bool &vk_pressed);

extern void ReleaseAllKeys (bool vk_pressed[256]);
extern void ReleaseAllKeys ();

extern bool IsImeHangul ();
extern void SetImeHangul (bool hangul);
extern bool ApplicationAlreadyExist (char *WindowClass, char *Title);

extern void ScreenDependentMousePos (int &mx, int &my);
extern void ScreenIndependentMousePos (int &mx, int &my);

extern CString GetVersionInfo(CString csEntry);


