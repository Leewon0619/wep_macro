#pragma once

enum eMacroType { MI_NONE = 0, MI_KEY, MI_MOUSE, MI_DELAY };


struct sKeybd {
	// High BYTE - Scan code
	// Low BYTE - Virtual key code
	long scan_vk_code;
	// 0x01 - 누르기
	// 0x02 - 떼기
	// 0x03 - 누르고 떼기
	// 0x10 - 한글 입력 상태, 이 비트가 0인 경우 영어 입력 상태
	// 0x20 - Extended key가 눌림, 이 비트가 0인 경우 일반 키
	unsigned long flags;

	void Step (bool vk_pressed[256]);
};

struct sMouse {
	long x, y;	// 마우스 커서의 위치
	// Low WORD:
	//	 MOUSEEVENTF_MOVE        0x0001 // mouse move 
	//	 MOUSEEVENTF_LEFTDOWN    0x0002 // left button down 
	//	 MOUSEEVENTF_LEFTUP      0x0004 // left button up 
	//	 MOUSEEVENTF_RIGHTDOWN   0x0008 // right button down 
	//	 MOUSEEVENTF_RIGHTUP     0x0010 // right button up 
	//	 MOUSEEVENTF_MIDDLEDOWN  0x0020 // middle button down 
	//	 MOUSEEVENTF_MIDDLEUP    0x0040 // middle button up 
	//	 MOUSEEVENTF_XDOWN       0x0080 // x button down (XBUTTON 1,2는 High byte에서 구분)
	//	 MOUSEEVENTF_XUP         0x0100 // x button down 
	//	 MOUSEEVENTF_WHEEL       0x0800 // wheel button rolled 
	// High WORD:
	//	 XBUTTON1, XBUTTON2, 휠의 굴린 양
	unsigned long flags;

	void Step (bool vk_pressed[256]);
};

struct sDelay {
	long delay; // 지연 시간 기록, 단위: msec

	bool Step (long &delay_count, long dt);
};

struct sMacroItem {
	eMacroType type;

	union {
		sKeybd keybd;
		sMouse mouse;
		sDelay delay;
		long   data[3];
	};

	sMacroItem () : type(MI_NONE) 
	{ 
		data[0] = data[1] = data[2] = 0;
	}
	
	sMacroItem (const sMacroItem &mi) {
		type = mi.type;
		data[0] = mi.data[0];
		data[1] = mi.data[1];
		data[2] = mi.data[2];
	}
	
	sMacroItem &operator = (const sMacroItem &mi) {
		if (this != &mi) {
			type = mi.type;
			data[0] = mi.data[0];
			data[1] = mi.data[1];
			data[2] = mi.data[2];
		}
		return *this;
	}
};
