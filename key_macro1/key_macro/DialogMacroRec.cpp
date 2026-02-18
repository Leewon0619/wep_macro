#include "stdafx.h"
#include <math.h>
#include "key_macro.h"
#include "DialogMacroRec.h"
#include "virtual_key.h"
#include "key_hook.h"
#include "AppIni.h"
#include "Common.h"

extern int _macro_name_ID;
extern const char *GetItemDescription (const sMacroItem &item);
CDialogMacroRec *g_recDlg = NULL;


IMPLEMENT_DYNAMIC(CDialogMacroRec, CDialog)


CDialogMacroRec::CDialogMacroRec(CWnd* pParent /*=NULL*/)
	: CDialogCommon(CDialogMacroRec::IDD, pParent)
{
	g_recDlg = this;
}

CDialogMacroRec::~CDialogMacroRec()
{
	g_recDlg = NULL;
}

void CDialogMacroRec::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	DDX_Control(pDX, IDC_LIST_ITEMS, _listItems);
}


BEGIN_MESSAGE_MAP(CDialogMacroRec, CDialog)
	ON_WM_TIMER()
	ON_CBN_SELCHANGE(IDC_COMBO_KEY, &CDialogMacroRec::OnCbnSelchangeComboKey)
	ON_BN_CLICKED(IDOK, &CDialogMacroRec::OnBnClickedOk)
	ON_BN_CLICKED(IDCANCEL, &CDialogMacroRec::OnBnClickedCancel)
	ON_BN_CLICKED(IDC_CHECK_REC_STAT, &CDialogMacroRec::OnBnClickedCheckRecStat)
	ON_BN_CLICKED(IDC_CHECK_REC_KEY, &CDialogMacroRec::OnBnClickedCheckRecKey)
	ON_BN_CLICKED(IDC_CHECK_REC_MOUSE, &CDialogMacroRec::OnBnClickedCheckRecMouse)
	ON_BN_CLICKED(IDC_CHECK_REC_MOUSE_POS, &CDialogMacroRec::OnBnClickedCheckRecMousePos)
	ON_BN_CLICKED(IDC_CHECK_REC_MOUSE_WHEEL, &CDialogMacroRec::OnBnClickedCheckRecMouseWheel)
	ON_BN_CLICKED(IDC_CHECK_TIME, &CDialogMacroRec::OnBnClickedCheckTime)
	ON_BN_CLICKED(IDC_CHECK_MERGE, &CDialogMacroRec::OnBnClickedCheckMerge)
END_MESSAGE_MAP()


BOOL CDialogMacroRec::OnInitDialog()
{
	CDialog::OnInitDialog();

	FillComboBoxVkList (IDC_COMBO_KEY, g_ini.keyMacroRecord);

	if (!_macro->name[0]) {
		sprintf (_macro->name, "Macro Rec. %d", ++_macro_name_ID);
		_macro->start_key	= VK_F2;
		_macro->stop_key	= VK_F3;
		_macro->repeat_cnt	= 1;

		// 제일 첫줄에 아무것도 아닌 항목을 삽입해 둔다.
		// 이유는, 선택한 항목 뒤에다가 새로운 항목을 추가할 수 있기때문에,
		// 이 NONE이 제일 처음에 없으면 첫줄에 새로운 항목을 추가할 수 없다.
		_macro->_item.resize(1);
		_macro->_item[0].type = MI_NONE;
	}

	for (unsigned int i=0; i<_macro->_item.size(); ++i) {
	   _listItems.InsertString (i, GetItemDescription (_macro->_item[i]));
	}
	_listItems.SetSel(0, TRUE);

	SetTextRecCount();

	CheckDlgButton (IDC_CHECK_REC_KEY,			(g_ini.recOptions.KEYBOARD_KEY_REC)		? BST_CHECKED : BST_UNCHECKED);	// Keyboard 입력 기록
	CheckDlgButton (IDC_CHECK_REC_MOUSE,		(g_ini.recOptions.MOUSE_BUTTON_REC)		? BST_CHECKED : BST_UNCHECKED);	// Mouse Button 입력 기록
	CheckDlgButton (IDC_CHECK_REC_MOUSE_POS,	(g_ini.recOptions.MOUSE_POSITION_REC)	? BST_CHECKED : BST_UNCHECKED);	// Mouse 위치 변화 기록
	CheckDlgButton (IDC_CHECK_REC_MOUSE_WHEEL,	(g_ini.recOptions.MOUSE_WHEEL_REC)		? BST_CHECKED : BST_UNCHECKED);	// Mouse 휠 변화 기록
	CheckDlgButton (IDC_CHECK_TIME,				(g_ini.recOptions.EVENT_DELAY)			? BST_CHECKED : BST_UNCHECKED);	// Keyboard나 Mouse 이벤트간 시간 간격 기록
	CheckDlgButton (IDC_CHECK_MERGE,			(g_ini.recOptions.MERGE_UP_DOWN)		? BST_CHECKED : BST_UNCHECKED);	// Button Up/Down 이벤트 합치기 허용

	SetDlgItemInt (IDC_EDIT_MOVE, g_ini.recMouseDistance);
	SetDlgItemDouble (IDC_EDIT_TIME, (double)g_ini.recEventTimeInterval/1000.);

	_macro_rec = false;
	_rec_time = 0;

	OnBnClickedCheckRecStat();

	SetTimer (1000, 33, NULL);

	return TRUE;  // return TRUE unless you set the focus to a control
	// EXCEPTION: OCX Property Pages should return FALSE
}

void CDialogMacroRec::OnCbnSelchangeComboKey()
{
	int index = SendDlgItemMessage (IDC_COMBO_KEY, CB_GETCURSEL, 0, 0);
	if (index != -1) {
		g_ini.keyMacroRecord = GetVkCode(index);
	}
}

void CDialogMacroRec::SetTextRecCount()
{
	char text[256];
	sprintf (text, "%d개 항목이 기록됨.", _macro->_item.size()-1);

	SetDlgItemText (IDC_STATIC_REC_COUNT, text);
}

void CDialogMacroRec::OnTimer(UINT_PTR nIDEvent)
{
	if (nIDEvent == 1000) {
		if (_listItems.GetCount() < (int)_macro->_item.size()) {
			for (unsigned int i=_listItems.GetCount(); i<_macro->_item.size(); ++i) {
			   _listItems.InsertString (i, GetItemDescription (_macro->_item[i]));
			}
			_listItems.SetCurSel(_macro->_item.size()-1);
			_listItems.ShowCaret ();

			SetTextRecCount();
		}
	}

	CDialog::OnTimer(nIDEvent);
}

void CDialogMacroRec::OnKeybdEvent (BYTE vk_code, bool vk_pressed, BYTE scan_code)
{
	if (vk_code == g_ini.keyMacroRecord && vk_pressed == true) {
		MacroRecStateChange (!_macro_rec);
	}

	if (_macro_rec) {
		if (vk_code) {
			if (g_ini.recOptions.KEYBOARD_KEY_REC) {	// 0x01 - Keyboard 입력 기록
				char hangul = IsImeHangul() ? 0x10 : 0x00;

				if (vk_pressed) {
					AddKey (vk_code, scan_code, hangul|0x01);	// Key Down
				}
				else {
					AddKey (vk_code, scan_code, hangul|0x02);	// Key Up
				}
			}
		}
	}
}

void CDialogMacroRec::OnMouseEvent (BYTE vk_code, bool vk_pressed, bool move, short wheelDelat, POINT &pt)
{
	if (vk_code == g_ini.keyMacroRecord && vk_pressed == true) {
		MacroRecStateChange (!_macro_rec);
	}

	if (_macro_rec) {
		if (g_ini.recOptions.MOUSE_BUTTON_REC) {	// 0x02 - Mouse Button 입력 기록
			if      (vk_code == VK_LBUTTON  &&  vk_pressed) AddMouse (pt.x, pt.y, MOUSEEVENTF_MOVE|MOUSEEVENTF_LEFTDOWN  );
			else if (vk_code == VK_LBUTTON  && !vk_pressed) AddMouse (pt.x, pt.y, MOUSEEVENTF_MOVE|MOUSEEVENTF_LEFTUP    );
			else if (vk_code == VK_RBUTTON  &&  vk_pressed) AddMouse (pt.x, pt.y, MOUSEEVENTF_MOVE|MOUSEEVENTF_RIGHTDOWN );
			else if (vk_code == VK_RBUTTON  && !vk_pressed) AddMouse (pt.x, pt.y, MOUSEEVENTF_MOVE|MOUSEEVENTF_RIGHTUP   );
			else if (vk_code == VK_MBUTTON  &&  vk_pressed) AddMouse (pt.x, pt.y, MOUSEEVENTF_MOVE|MOUSEEVENTF_MIDDLEDOWN);
			else if (vk_code == VK_MBUTTON  && !vk_pressed) AddMouse (pt.x, pt.y, MOUSEEVENTF_MOVE|MOUSEEVENTF_MIDDLEUP  );
			else if (vk_code == VK_XBUTTON1 &&  vk_pressed) AddMouse (pt.x, pt.y, MAKELONG(MOUSEEVENTF_MOVE|MOUSEEVENTF_XDOWN, XBUTTON1));
			else if (vk_code == VK_XBUTTON1 && !vk_pressed) AddMouse (pt.x, pt.y, MAKELONG(MOUSEEVENTF_MOVE|MOUSEEVENTF_XUP,   XBUTTON1));
			else if (vk_code == VK_XBUTTON2 &&  vk_pressed) AddMouse (pt.x, pt.y, MAKELONG(MOUSEEVENTF_MOVE|MOUSEEVENTF_XDOWN, XBUTTON2));
			else if (vk_code == VK_XBUTTON2 && !vk_pressed) AddMouse (pt.x, pt.y, MAKELONG(MOUSEEVENTF_MOVE|MOUSEEVENTF_XUP,   XBUTTON2));
		}
		if (g_ini.recOptions.MOUSE_POSITION_REC) {	// 0x04 - Mouse 위치 변화 기록
			if (move) { 
				if (MouseDistance(&pt) >= g_ini.recMouseDistance) {
					AddMouse (pt.x, pt.y, MOUSEEVENTF_MOVE);
				}
			}
		}
		if (g_ini.recOptions.MOUSE_WHEEL_REC) {		// 0x08 - Mouse 휠 변화 기록
			if (vk_code == 0x0A || vk_code == 0x0B) {	// Wheel forward or reverse
				AddMouse (pt.x, pt.y, MAKELONG(MOUSEEVENTF_WHEEL, wheelDelat));
			}
		}
	}
}

int CDialogMacroRec::MouseDistance (POINT *pt)
{
	if (_macro->_item.size() > 0) {
		sMacroItem &_item = _macro->_item[_macro->_item.size()-1];

		if (_item.type == MI_MOUSE) {
			int dx = _item.mouse.x - pt->x;
			int dy = _item.mouse.y - pt->y;

			return (int)sqrt((double)dx*dx + dy*dy);
		}
	}
	return 1000000;
}

void CDialogMacroRec::AddTimeDelayIf ()
{
	if (g_ini.recOptions.EVENT_DELAY) {	// 0x10 - Keyboard나 Mouse 이벤트간 시간 간격 기록
		DWORD cur_time = GetTickCount ();

		if ((int)(cur_time - _rec_time) >= g_ini.recEventTimeInterval) {
			AddTimeDelay (cur_time - _rec_time);
		}
		_rec_time = cur_time;
	}
}

bool CDialogMacroRec::LastIsSameKeyDown (int scan_vk_code)
{
	if (_macro->_item.size() > 0) {
		sMacroItem &_item = _macro->_item[_macro->_item.size() - 1];

		if (_item.type == MI_KEY &&
			_item.keybd.scan_vk_code == scan_vk_code &&
			(_item.keybd.flags&0x03) == 0x01) return true;
	}
	return false;
}

void CDialogMacroRec::AddKey (BYTE vk_code, BYTE scan_code, long flags)
{
	AddTimeDelayIf ();

	long scan_vk_code = MAKEWORD (vk_code, scan_code);

	if ((g_ini.recOptions.MERGE_UP_DOWN) && 
		(flags & 0x02) && 
		LastIsSameKeyDown(scan_vk_code)) {	// 0x20 - Button Up/Down 이벤트 합치기 허용
		// 이전 키가 눌린 상태라서 누르고 떼기 상태로 바꾼다.
		int last_index = _macro->_item.size() - 1; // 제일 마지막 이벤트
		_macro->_item[last_index].keybd.flags |= 0x02;

		_listItems.DeleteString (last_index);
	}
	else {
		sMacroItem _item;

		_item.type             = MI_KEY;
		_item.keybd.scan_vk_code = scan_vk_code;
		_item.keybd.flags        = flags;

		_macro->_item.push_back (_item);
	}
}

bool CDialogMacroRec::LastIsSameMouseDown (long x, long y, long flags)
{
	const int MOUSEEVENTF_DOWN = MOUSEEVENTF_LEFTDOWN|MOUSEEVENTF_RIGHTDOWN|MOUSEEVENTF_MIDDLEDOWN|MOUSEEVENTF_XDOWN;

	if (_macro->_item.size() > 0) {
		sMacroItem &_item = _macro->_item[_macro->_item.size() - 1];

		if (_item.type == MI_MOUSE) {
			if ((_item.mouse.flags&MOUSEEVENTF_LEFTDOWN		&& flags&MOUSEEVENTF_LEFTUP) ||
				(_item.mouse.flags&MOUSEEVENTF_RIGHTDOWN	&& flags&MOUSEEVENTF_RIGHTUP) ||
				(_item.mouse.flags&MOUSEEVENTF_MIDDLEDOWN	&& flags&MOUSEEVENTF_MIDDLEUP) ||
				(_item.mouse.flags&MOUSEEVENTF_XDOWN		&& flags&MOUSEEVENTF_XUP) ){

				if (_item.mouse.x == x && _item.mouse.y == y) return true;
			}
		}
	}
	return false;
}

void CDialogMacroRec::AddMouse (long mx, long my, long flags)
{
	AddTimeDelayIf ();

	const int MOUSEEVENTF_UP = MOUSEEVENTF_LEFTUP|MOUSEEVENTF_RIGHTUP|MOUSEEVENTF_MIDDLEUP|MOUSEEVENTF_XUP;

	if ((g_ini.recOptions.MERGE_UP_DOWN) && 
		(flags&MOUSEEVENTF_UP) && 
		LastIsSameMouseDown(mx, my, flags)) {	// 0x20 - Button Up/Down 이벤트 합치기 허용
		// 이전 마우스 버튼이 눌린 상태라서 클릭 상태로 바꾼다.
		_macro->_item[_macro->_item.size()-1].mouse.flags |= flags;

		_listItems.DeleteString (_macro->_item.size()-1);
	}
	else {
		sMacroItem _item;

		_item.type        = MI_MOUSE;
		_item.mouse.flags = flags;
		_item.mouse.x     = mx;
		_item.mouse.y     = my;

		_macro->_item.push_back (_item);
	}
}

void CDialogMacroRec::AddTimeDelay (long delay)
{
	sMacroItem _item;

	_item.type       = MI_DELAY;
	_item.delay.delay = delay;

	_macro->_item.push_back (_item);
}

void CDialogMacroRec::EnableWindowItem(BOOL enable)
{
	GetDlgItem(IDC_COMBO_KEY)				->EnableWindow (enable);
	GetDlgItem(IDC_CHECK_REC_KEY)			->EnableWindow (enable);
	GetDlgItem(IDC_CHECK_REC_MOUSE)			->EnableWindow (enable);
	GetDlgItem(IDC_CHECK_REC_MOUSE_POS)		->EnableWindow (enable);
	GetDlgItem(IDC_CHECK_REC_MOUSE_WHEEL)	->EnableWindow (enable);
	GetDlgItem(IDC_CHECK_TIME)				->EnableWindow (enable);
	GetDlgItem(IDC_CHECK_MERGE)				->EnableWindow (enable);
	GetDlgItem(IDC_EDIT_MOVE)				->EnableWindow (enable);
	GetDlgItem(IDC_EDIT_TIME)				->EnableWindow (enable);
}

void CDialogMacroRec::MacroRecStateChange(bool rec)
{
	g_ini.recMouseDistance = GetDlgItemInt (IDC_EDIT_MOVE);
	g_ini.recEventTimeInterval = (int)(1000*GetDlgItemDouble (IDC_EDIT_TIME));

	if (rec) {
		CheckDlgButton (IDC_CHECK_REC_STAT, BST_CHECKED);
		SetDlgItemText (IDC_CHECK_REC_STAT, "매크로 기록 중");

		EnableWindowItem (FALSE);

		_macro_rec = true;
		_rec_time  = GetTickCount ();
	}
	else {
		_macro_rec = false;

		CheckDlgButton (IDC_CHECK_REC_STAT, BST_UNCHECKED);
		SetDlgItemText (IDC_CHECK_REC_STAT, "기록 대기 중");

		EnableWindowItem (TRUE);
	}
}

void CDialogMacroRec::MacroRecOptionChanged()
{
	g_ini.recOptions.KEYBOARD_KEY_REC	= (IsDlgButtonChecked (IDC_CHECK_REC_KEY)			== BST_CHECKED) ? 1 : 0;	// Keyboard 입력 기록
	g_ini.recOptions.MOUSE_BUTTON_REC	= (IsDlgButtonChecked (IDC_CHECK_REC_MOUSE)			== BST_CHECKED) ? 1 : 0;	// Mouse Button 입력 기록
	g_ini.recOptions.MOUSE_POSITION_REC = (IsDlgButtonChecked (IDC_CHECK_REC_MOUSE_POS)		== BST_CHECKED) ? 1 : 0;	// Mouse 위치 변화 기록
	g_ini.recOptions.MOUSE_WHEEL_REC	= (IsDlgButtonChecked (IDC_CHECK_REC_MOUSE_WHEEL)	== BST_CHECKED) ? 1 : 0;	// Mouse 휠 변화 기록
	g_ini.recOptions.EVENT_DELAY		= (IsDlgButtonChecked (IDC_CHECK_TIME)				== BST_CHECKED) ? 1 : 0;	// Keyboard나 Mouse 이벤트간 시간 간격 기록
	g_ini.recOptions.MERGE_UP_DOWN		= (IsDlgButtonChecked (IDC_CHECK_MERGE)				== BST_CHECKED) ? 1 : 0;	// Button Up/Down 이벤트 합치기 허용
}

void CDialogMacroRec::OnBnClickedCheckRecStat()
{
	MacroRecStateChange (IsDlgButtonChecked (IDC_CHECK_REC_STAT) == BST_CHECKED);

	GetDlgItem (IDC_LIST_ITEMS)->SetFocus ();
}

void CDialogMacroRec::OnBnClickedCheckRecKey()			{ MacroRecOptionChanged();	}
void CDialogMacroRec::OnBnClickedCheckRecMouse()		{ MacroRecOptionChanged();	}
void CDialogMacroRec::OnBnClickedCheckRecMousePos()		{ MacroRecOptionChanged();	}
void CDialogMacroRec::OnBnClickedCheckRecMouseWheel()	{ MacroRecOptionChanged();	}
void CDialogMacroRec::OnBnClickedCheckTime()			{ MacroRecOptionChanged();	}
void CDialogMacroRec::OnBnClickedCheckMerge()			{ MacroRecOptionChanged();	}

void CDialogMacroRec::OnBnClickedOk()
{
	MacroRecStateChange (false);

	OnOK();
}

void CDialogMacroRec::OnBnClickedCancel()
{
	MacroRecStateChange (false);

	OnCancel();
}

