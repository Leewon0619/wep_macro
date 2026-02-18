#include "StdAfx.h"
#include "macro_def.h"
#include "virtual_key.h"
#include "AppIni.h"


const char *strKeyboardOption (int flags)
{
	switch (flags) {
	case 0x00: return "";
	case 0x01: return "누르기";
	case 0x02: return "떼기";
	case 0x03: return "";
	default:   return "(오류)";
	}
}

const char *strMouseOption (int flags)
{
	switch (flags) {
	case 0x00: return "";
	case 0x01: return "누르기";
	case 0x02: return "떼기";
	case 0x03: return "클릭";
	default:   return "(오류)";
	}
}

const char *GetItemDescription (const sMacroItem &item)
{
	int n = 0;
	static char desc[256];	// 문자열을 리턴해야 하기때문에 static으로 선언한다.
	desc[0] = '\0';

	switch (item.type) {
	case MI_NONE: 
		n = sprintf (desc, "(시작)");
		break;

	case MI_KEY: {
		int index = GetVkIndex(LOBYTE(item.keybd.scan_vk_code));
		n = sprintf (desc, "키보드 %s ", GetVkDesc(index));
		if (item.keybd.flags) { 
			n += sprintf (desc + n, "%s ", strKeyboardOption(item.keybd.flags&0x03));
			if (g_ini.macroOptions.CHECK_IME_HAN_ENG) {
				n += sprintf (desc + n, "[%s] ", (item.keybd.flags&0x10) ? "한글" : "영어");
			}
		}
		break; }

	case MI_MOUSE: {
		n = sprintf (desc, "마우스 ");
		if (item.mouse.flags & MOUSEEVENTF_MOVE) {
			n += sprintf (desc + n, "위치(%d, %d) ", item.mouse.x, item.mouse.y);
		}

		if (item.mouse.flags & MOUSEEVENTF_WHEEL) {
			n += sprintf (desc + n, "휠(%d) ", (int)(short)HIWORD(item.mouse.flags));
		}

		int flags = (item.mouse.flags>>1) & 0x03;
		if (flags) n += sprintf (desc + n, "왼버튼_%s ", strMouseOption(flags));

		flags = (item.mouse.flags>>3) & 0x03;
		if (flags) n += sprintf (desc + n, "오른버튼_%s ", strMouseOption(flags));

		flags = (item.mouse.flags>>5) & 0x03;
		if (flags) n += sprintf (desc + n, "중앙버튼_%s ", strMouseOption(flags));

		flags = (item.mouse.flags>>7) & 0x03;
		if (flags) {
			if (HIWORD(item.mouse.flags) == XBUTTON1) {
				n += sprintf (desc + n, "X1버튼_%s ", strMouseOption(flags));
			}
			if (HIWORD(item.mouse.flags) == XBUTTON2) {
				n += sprintf (desc + n, "X2버튼_%s ", strMouseOption(flags));
			}
		}
		break; }

	case MI_DELAY:
		n = sprintf (desc, "시간지연 %0.3f 초", (double)item.delay.delay/1000.);
		break;
	}

	return desc;
}

