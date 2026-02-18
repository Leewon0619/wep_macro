#include "stdafx.h"
#include "macro_item.h"
#include "macro_def.h"
#include "AppIni.h"
#include "common.h"

void sKeybd::Step (bool vk_pressed[256])
{
	bool hangul    = (flags & 0x10) ? true : false;
	bool extended  = (flags & 0x20) ? true : false;
	BYTE vk_code   = LOBYTE (scan_vk_code);
	BYTE scan_code = HIBYTE (scan_vk_code);

	// Scan code가 설정되어 있지 않으면 Virtual key로부터 Scan code를 얻어온다.
	if (scan_code == 0) scan_code = MapVirtualKey (vk_code, MAPVK_VK_TO_VSC);	

	if (g_ini.macroOptions.CHECK_IME_HAN_ENG) {
		SetImeHangul (hangul);
	}

	if (flags & 0x01) {	// 키 누름 상태
		int flags = extended ? KEYEVENTF_EXTENDEDKEY : 0;
		keybd_event (vk_code, scan_code, flags, EX_KEY_MACRO_ITSELF);

		vk_pressed[vk_code] = true;
		// MacroStartStopShortkey (vk_code, true);
	}

	if (flags & 0x02) {	// 키 뗌 상태
		int flags = KEYEVENTF_KEYUP;
		if (extended) flags |= KEYEVENTF_EXTENDEDKEY;
		keybd_event (vk_code, scan_code, flags, EX_KEY_MACRO_ITSELF);

		vk_pressed[vk_code] = false;
		// MacroStartStopShortkey (vk_code, false);
	}
}

void sMouse::Step (bool vk_pressed[256])
{
	int mx = x;
	int my = y;

	ScreenIndependentMousePos (mx, my);

	DWORD flags_bt_down = flags & (
		MOUSEEVENTF_LEFTDOWN   | MOUSEEVENTF_RIGHTDOWN | 
		MOUSEEVENTF_MIDDLEDOWN | MOUSEEVENTF_XDOWN | 
		MOUSEEVENTF_MOVE       | MOUSEEVENTF_WHEEL);
	DWORD flags_bt_up = flags & (
		MOUSEEVENTF_LEFTUP   | MOUSEEVENTF_RIGHTUP | 
		MOUSEEVENTF_MIDDLEUP | MOUSEEVENTF_XUP );
	
	if (flags_bt_down & MOUSEEVENTF_MOVE) {
		flags_bt_down |= MOUSEEVENTF_ABSOLUTE;
	}

	if (flags_bt_down) mouse_event (flags_bt_down, mx, my, HIWORD(flags), EX_KEY_MACRO_ITSELF);
	if (flags_bt_up)   mouse_event (flags_bt_up,   mx, my, HIWORD(flags), EX_KEY_MACRO_ITSELF);

	bool vk_pressed_ = false;
	BYTE vk_code = MouseButton2VkCode (flags, vk_pressed_);

	vk_pressed[vk_code] = vk_pressed_;
	// MacroStartStopShortkey (vk_code, vk_pressed_);
}

bool sDelay::Step (long &delay_count, long dt)
{
	if (delay_count == 0) {
		delay_count = delay;
	}
	else {
		delay_count -= dt;
	}
	
	if (delay_count <= 0) { 
		delay_count = 0;
		return true;
	}
	return false;
}
