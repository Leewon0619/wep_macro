#pragma once
#include "common.h"
#include "macro_item.h"
#include <vector>

using namespace std;

#define VK_KEY_UP			0x00010000
#define VK_KEY_MASK			0x000000FF

struct sMacro {
	char name[256];			// 매크로 이름
	long start_key;			// 매크로 시작 키, 0x10000 - 키 뗄 때
	long stop_key;			// 매크로 종료 키, 0x10000 - 키 뗄 때
	long repeat_cnt;		// 매크로 반복실행 횟수(0이면 무한반복)

	vector<sMacroItem> _item;

	// 매크로 실행시 필요한 변수들
	long index;				// 키보드/마우스 이벤트에 대한 색인
	long delay;				// 지연시간 카운트에 사용
	long run_count;			// 매크로 수행 횟수 카운트
	bool vk_pressed[256];	// Virtual key code가 눌렸을 때 true

	void init ();
	void start (int index_ = 1);
	void stop ();

	bool is_running()
	{
		return 0 <= index && index < (int)_item.size();
	}

	sMacro () : 
		start_key(0), 
		stop_key(0), 
		repeat_cnt(1) 
	{
		init();
		name[0] = '\0';
	}
	
	sMacro (const sMacro &macro) 
	{
		strncpy (name, macro.name, 256);
		name[256-1] = '\0';
		start_key	= macro.start_key;
		stop_key	= macro.stop_key;
		repeat_cnt	= macro.repeat_cnt;
		_item = macro._item;

		init ();
	}

	sMacro &operator = (const sMacro &macro) 
	{
		if (this != &macro) {
			strncpy (name, macro.name, 256);
			name[256-1] = '\0';
			start_key	= macro.start_key;
			stop_key	= macro.stop_key;
			repeat_cnt	= macro.repeat_cnt;
			_item = macro._item;

			init ();
		}
		return *this;
	}
};

extern vector<sMacro> g_macros;

extern void MacroInit ();
extern void MacroTerm ();

extern void AllMacroStep (int dt);
extern void MacroStep (sMacro &m, int dt);

extern void MacroStartStopShortkey (BYTE vk_code, bool vk_pressed);

