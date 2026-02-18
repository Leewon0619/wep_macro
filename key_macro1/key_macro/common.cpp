#include "stdafx.h"
#include <Imm.h>
#include "common.h"


#pragma comment (lib, "Version.lib")

void ScreenDependentMousePos (int &mx, int &my)
{
	mx = (int)(mx*GetSystemMetrics(SM_CXSCREEN)/65536.);
	my = (int)(my*GetSystemMetrics(SM_CYSCREEN)/65536.);
}

void ScreenIndependentMousePos (int &mx, int &my)
{
	mx = (mx > 0) ? 
		(int)((mx+0.5)*65536./GetSystemMetrics(SM_CXSCREEN)) : 
		(int)((mx-0.5)*65536./GetSystemMetrics(SM_CXSCREEN)) ;
	my = (my > 0) ? 
		(int)((my+0.5)*65536./GetSystemMetrics(SM_CYSCREEN)) : 
		(int)((my-0.5)*65536./GetSystemMetrics(SM_CYSCREEN)) ;
}

BYTE MouseButton2VkCode (long flags, bool &vk_pressed)
{
	BYTE vk_code = 0;
	vk_pressed = false;

	if      (flags & MOUSEEVENTF_LEFTDOWN)  { vk_code = VK_LBUTTON;  vk_pressed = true;  }
	else if (flags & MOUSEEVENTF_LEFTUP)    { vk_code = VK_LBUTTON;  vk_pressed = false; }
	else if (flags & MOUSEEVENTF_RIGHTDOWN) { vk_code = VK_RBUTTON;  vk_pressed = true;  }
	else if (flags & MOUSEEVENTF_RIGHTUP)   { vk_code = VK_RBUTTON;  vk_pressed = false; }
	else if (flags & MOUSEEVENTF_MIDDLEDOWN){ vk_code = VK_MBUTTON;  vk_pressed = true;  }
	else if (flags & MOUSEEVENTF_MIDDLEUP)  { vk_code = VK_MBUTTON;  vk_pressed = false; }
	else if (flags & MOUSEEVENTF_WHEEL)     { vk_code = ((short)HIWORD(flags) > 0) ? 0x0A : 0x0B; vk_pressed = true; }
	else if (flags & MOUSEEVENTF_XDOWN) {
		if (HIWORD(flags) & XBUTTON1)		{ vk_code = VK_XBUTTON1; vk_pressed = true;  }
		if (HIWORD(flags) & XBUTTON2)		{ vk_code = VK_XBUTTON2; vk_pressed = true;  }
	}
	else if (flags & MOUSEEVENTF_XUP) {
		if (HIWORD(flags) & XBUTTON1)		{ vk_code = VK_XBUTTON1; vk_pressed = false; }
		if (HIWORD(flags) & XBUTTON2)		{ vk_code = VK_XBUTTON2; vk_pressed = false; }
	}
	return vk_code;
}

bool IsImeHangul()
{
	// 현재 IME 상태가 한글인지 영문인지 체크한다.

	HWND hWnd = ::GetForegroundWindow();
	if (hWnd) {
		HWND hWndIme = ImmGetDefaultIMEWnd(hWnd);
		if (hWndIme) {
			int ret = ::SendMessage(hWndIme, WM_IME_CONTROL, 0x5, 0);
			return ret ? true : false;
		}
	}
	return false;
}

void SetImeHangul (bool hangul)
{
	// IME를 한글이나 영문으로 변환한다.
	// 한 번에 안바뀌는 경우가 있으므로, 안바뀌는경우 10번 시도한다.

	for (int i=0; i<10; i++) {
		if (IsImeHangul() != hangul) {
			keybd_event (VK_HANGUL, MapVirtualKey (VK_HANGUL, MAPVK_VK_TO_VSC), KEYEVENTF_EXTENDEDKEY, EX_KEY_MACRO_ITSELF);
			Sleep (33);
			keybd_event (VK_HANGUL, MapVirtualKey (VK_HANGUL, MAPVK_VK_TO_VSC), KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, EX_KEY_MACRO_ITSELF);
			Sleep (33);
		}
	}
}

void ReleaseAllKeys (bool vk_pressed[256])
{
	// vk_pressed 배열에서 true 인 경우, Key up 이벤트를 보낸다.
	for (int vk_index=0; vk_index<256; vk_index++) {
		if (vk_pressed[vk_index]) {
			switch (vk_index) {
			case VK_LBUTTON:  mouse_event (MOUSEEVENTF_LEFTUP,   0, 0, 0,        EX_KEY_MACRO_ITSELF);	break;
			case VK_RBUTTON:  mouse_event (MOUSEEVENTF_RIGHTUP,  0, 0, 0,        EX_KEY_MACRO_ITSELF);	break;
			case VK_MBUTTON:  mouse_event (MOUSEEVENTF_MIDDLEUP, 0, 0, 0,        EX_KEY_MACRO_ITSELF);	break;
			case VK_XBUTTON1: mouse_event (MOUSEEVENTF_XUP,		 0, 0, XBUTTON1, EX_KEY_MACRO_ITSELF);	break;
			case VK_XBUTTON2: mouse_event (MOUSEEVENTF_XUP,		 0, 0, XBUTTON2, EX_KEY_MACRO_ITSELF);	break;
			default:          keybd_event (vk_index, MapVirtualKey (vk_index, MAPVK_VK_TO_VSC), KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, EX_KEY_MACRO_ITSELF); break;
			}
		}
	}
	memset (vk_pressed, 0, sizeof(bool)*256);
}

void ReleaseAllKeys ()
{
	// 모든 눌린 키를 해제 한다.
	GetKeyState(0); // Windows - Dev Center 도움말에 의하면... 
	// GetKeyboardState()를 실행하기 전에 GetKeyState() 를 호출해야 정상 동작한다고 함.

	BYTE keyState[256];
	GetKeyboardState((LPBYTE)&keyState);

	for (int vk_index=0; vk_index<256; vk_index++) {
		if (keyState[vk_index] & 0x80) {	// 눌린 상태이면
			keybd_event (vk_index, MapVirtualKey (vk_index, MAPVK_VK_TO_VSC), KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, EX_KEY_MACRO_ITSELF);
		}
	}
}

bool ApplicationAlreadyExist (char *WindowClass, char *Title)
{
	// 응용 프로그램이 현재 실행 중인지 체크한다.

	HANDLE hMutex = CreateMutex(NULL, TRUE, Title);   // Create mutex
	switch(GetLastError()) {
	case ERROR_SUCCESS:			break;
	case ERROR_ALREADY_EXISTS:	return true;
	default:					return false;
	}
	return false;
}

CString GetVersionInfo(CString csEntry)
{
	// 리소스에서 버젼 정보를 가져온다.
	CString csRet = "";

	HRSRC hResInfo = FindResource (NULL, MAKEINTRESOURCE(VS_VERSION_INFO), RT_VERSION);
	
	if (hResInfo) {
		HGLOBAL hResData = LoadResource (NULL, hResInfo);
		DWORD dwSize = SizeofResource (NULL, hResInfo);

		if (hResData) {
			LPVOID pRes = LockResource (hResData);

			if (pRes) {
				// 리소스를 직접 엑세스 할 수 없다. 메모리를 복사해 온다.
				LPVOID pResCopy = LocalAlloc(LMEM_FIXED, dwSize+1000);	// dwSize보다 더 크게... VerQueryValue() 함수가 pResCopy 메모리에 뭔가를 쓰는듯
				CopyMemory (pResCopy, pRes, dwSize);
				UnlockResource (hResData);
				FreeResource (hResData);

				UINT vLen;
				LPVOID retbuf = NULL;
				char query[256];

				BOOL retVal = VerQueryValue (pResCopy, "\\VarFileInfo\\Translation", &retbuf, &vLen);
				if (retVal && vLen==4) {
					DWORD langD = *(DWORD *)retbuf;
	
					sprintf(query, "\\StringFileInfo\\%02X%02X%02X%02X\\%s",
						(langD>> 8)&0xFF, (langD>> 0)&0xFF, (langD>>24)&0xFF, (langD>>16)&0xFF, (LPCTSTR)csEntry);
				}
				else {
					sprintf(query, "\\StringFileInfo\\%04X04B0\\%s", GetUserDefaultLangID(), (LPCTSTR)csEntry);
				}

				retVal = VerQueryValue (pResCopy, query, &retbuf, &vLen);
				if (retVal) {
					csRet = (char*)retbuf;
				}

				LocalFree(pResCopy);
			}
		}
	}

	return csRet;
}