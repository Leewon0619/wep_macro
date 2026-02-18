#include "stdafx.h"
#include <time.h>
#include <math.h>
#include "macro_def.h"
#include "AppIni.h"
#include "Common.h"


static bool macroRunning = false;
vector<sMacro> g_macros;

void sMacro::init ()
{
	index = -1;
	delay = 0;
	run_count = 0;
	memset (vk_pressed, 0, sizeof(bool)*256);
}

void sMacro::start (int index_)
{
	init();
	index = index_;
}

void sMacro::stop ()
{
	index = _item.size();
	run_count = repeat_cnt;

	if (g_ini.macroOptions.RELEASE_ALL_KEYS) {
		// 매크로가 종료될 때 키보드나 마우스의 눌린 키가 있다면 이를 떼도록 한다.
		ReleaseAllKeys (vk_pressed);
	}
}


void MacroInit ()
{
	macroRunning = true;

	for (unsigned int i=0; i<g_macros.size(); ++i) {
		g_macros[i].init ();
	}
}

void MacroTerm ()
{
	macroRunning = false;

	for (unsigned int i=0; i<g_macros.size(); ++i) {
		g_macros[i].stop ();
	}

	if (g_ini.macroOptions.RELEASE_ALL_KEYS) {
		ReleaseAllKeys ();
	}
}


void MacroStartStopShortkey (BYTE vk_code, bool vk_pressed)
{
	if (!macroRunning) return;

	long vk_code_pressed = vk_code;
	if (!vk_pressed) vk_code_pressed |= VK_KEY_UP;

	for (unsigned int i=0; i<g_macros.size(); ++i) {
		sMacro &m = g_macros[i];

		// 매크로가 비실행상태에서 시작키가 눌렸을 때, 첫 _item부터 시작한다.
		if (!m.is_running() && m.start_key == vk_code_pressed) {
			m.start (1);
		}
		// 매크로가 실행상태에서 중지키가 눌렸을 때, 중지 상태로 만든다.
		else if (m.is_running() && m.stop_key == vk_code_pressed) {
			m.stop ();
		}
	}
}

void MacroStart (int id, int index)
{
	if (0 <= id && id < (int)g_macros.size()) {
		// 매크로가 비실행 상태이거나 실행종료 상태이면 첫 _item부터 시작한다.
		if (!g_macros[id].is_running()) {
			g_macros[id].start (index);
		}
	}
}


void MacroStep (sMacro &m, int dt)
{
	sMacroItem &mi = m._item[m.index];

	switch (mi.type) {
	case MI_KEY: 
		mi.keybd.Step (m.vk_pressed);
		m.index ++;
		break;
	case MI_MOUSE: 
		mi.mouse.Step (m.vk_pressed);
		m.index ++;
		break;
	case MI_DELAY:
		if (mi.delay.Step (m.delay, dt)) {
			m.index++;
		}
		break;
	default:
		m.index ++;
		break;
	}
}

void AllMacroStep (int dt)
{
	if (!macroRunning) return;

	for (unsigned int i=0; i<g_macros.size(); ++i) {
		sMacro &m = g_macros[i];

		if (0 < m.index && m.index < (int)m._item.size()) {
			MacroStep (m, dt);

			if ((int)m._item.size() <= m.index) {
				m.run_count++;

				if ((m.repeat_cnt == 0) || (m.run_count < m.repeat_cnt)) {
					m.index = 1; // 처음부터 재시작
				}
				else {
					m.stop ();	// 여기서 종료
				}
			}
		}
	}
}
