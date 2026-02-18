#include "stdafx.h"
#include "key_macro.h"
#include "key_macroDlg.h"
#include "DialogMacroEdit.h"
#include "DialogMacroRec.h"
#include "macro_def.h"
#include "macro_file.h"
#include "key_hook.h"
#include "virtual_key.h"
#include "AppIni.h"
#include "common.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

static bool _macro_changed = false;
Ckey_macroDlg *g_macroDlg = NULL;


// Ckey_macroDlg 대화 상자
Ckey_macroDlg::Ckey_macroDlg(CWnd* pParent /*=NULL*/)
	: CDialogCommon(Ckey_macroDlg::IDD, pParent)
{
	_macro_exec_time = 0;

	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);

	g_macroDlg = this;
}

Ckey_macroDlg::~Ckey_macroDlg()
{
	g_macroDlg = NULL;
}

void Ckey_macroDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialog::DoDataExchange(pDX);
	DDX_Control(pDX, IDC_LIST_MACROS, _listMacros);
	DDX_Control(pDX, IDC_LIST_MACROS2, _listMacros2);
	DDX_Control(pDX, IDC_STATIC_HOMEPAGE, _staticHomepage);
}

BEGIN_MESSAGE_MAP(Ckey_macroDlg, CDialog)
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	//}}AFX_MSG_MAP
	ON_WM_INPUT()
	ON_WM_DESTROY()
	ON_WM_TIMER()
	ON_BN_CLICKED(IDOK, &Ckey_macroDlg::OnBnClickedOk)
	ON_BN_CLICKED(IDCANCEL, &Ckey_macroDlg::OnBnClickedCancel)
	ON_BN_CLICKED(IDC_RADIO_MACRO_RUN, &Ckey_macroDlg::OnBnClickedRadioRun)
	ON_BN_CLICKED(IDC_RADIO_MACRO_EDIT, &Ckey_macroDlg::OnBnClickedRadioEdit)
	ON_BN_CLICKED(IDC_BUTTON_ADD_MACRO, &Ckey_macroDlg::OnBnClickedButtonAddMacro)
	ON_BN_CLICKED(IDC_BUTTON_COPY_MACRO, &Ckey_macroDlg::OnBnClickedButtonCopyMacro)
	ON_BN_CLICKED(IDC_BUTTON_DELETE_MACRO, &Ckey_macroDlg::OnBnClickedButtonDeleteMacro)
	ON_BN_CLICKED(IDC_BUTTON_EDIT_MACRO, &Ckey_macroDlg::OnBnClickedButtonEditMacro)
	ON_BN_CLICKED(IDC_BUTTON_MACRO_FILE, &Ckey_macroDlg::OnBnClickedButtonMacroFile)
	ON_BN_CLICKED(IDC_BUTTON_REC_MACRO, &Ckey_macroDlg::OnBnClickedButtonRecMacro)
	ON_BN_CLICKED(IDC_BUTTON_UP, &Ckey_macroDlg::OnBnClickedButtonUp)
	ON_BN_CLICKED(IDC_BUTTON_DOWN, &Ckey_macroDlg::OnBnClickedButtonDown)
	ON_BN_CLICKED(IDC_BUTTON_SAVE, &Ckey_macroDlg::OnBnClickedButtonSave)
	ON_BN_CLICKED(IDC_BUTTON_QUIT, &Ckey_macroDlg::OnBnClickedButtonQuit)
	ON_LBN_DBLCLK(IDC_LIST_MACROS, &Ckey_macroDlg::OnLbnDblclkListMacros)
	ON_CBN_SELCHANGE(IDC_COMBO_KEY, &Ckey_macroDlg::OnCbnSelchangeComboKey)
	ON_BN_CLICKED(IDC_CHECK_IME_HAN_ENG, &Ckey_macroDlg::OnBnClickedCheckImeHanEng)
	ON_BN_CLICKED(IDC_CHECK_RELEASE_ALL_KEY, &Ckey_macroDlg::OnBnClickedCheckReleaseAllKey)
END_MESSAGE_MAP()


// Ckey_macroDlg 메시지 처리기
BOOL Ckey_macroDlg::OnInitDialog()
{
	CDialog::OnInitDialog();

	// 이 대화 상자의 아이콘을 설정합니다. 응용 프로그램의 주 창이 대화 상자가 아닐 경우에는
	//  프레임워크가 이 작업을 자동으로 수행합니다.
	SetIcon(m_hIcon, TRUE);			// 큰 아이콘을 설정합니다.
	SetIcon(m_hIcon, FALSE);		// 작은 아이콘을 설정합니다.

	// TODO: 여기에 추가 초기화 작업을 추가합니다.
	SetWindowText (g_ini.macroProgramTitle);

	// 타이틀 바(캡션바)에서 종료버튼을 비활성화
	CMenu *pMenu = GetSystemMenu(FALSE);
	pMenu->RemoveMenu(SC_CLOSE, MF_BYCOMMAND);

	// 윈도우의 위치를 복원한다.
	DlgInScreen (g_ini.windowSX, g_ini.windowSY);
	SetWindowPos (NULL, g_ini.windowSX, g_ini.windowSY, 0, 0, SWP_NOSIZE | SWP_NOZORDER);

	FillComboBoxVkList (IDC_COMBO_KEY, g_ini.keyMacroRun);

	// 파일로부터 매크로를 읽어들임
	SetDlgItemText (IDC_EDIT_MACRO_FILE, g_ini.macroFileName);

	// 매크로가 처음에는 편집 상태가 되도록 라디오 버튼 설정
	CheckDlgButton (IDC_RADIO_MACRO_RUN,   BST_UNCHECKED);
	CheckDlgButton (IDC_RADIO_MACRO_EDIT,  BST_CHECKED);

	// 매크로 실행 옵션 
	if (g_ini.eventDelay < 1) g_ini.eventDelay = 1;
	SetDlgItemInt (IDC_EDIT_EVENT_MIN_DELAY, g_ini.eventDelay, FALSE);
	CheckDlgButton (IDC_CHECK_IME_HAN_ENG,	    g_ini.macroOptions.CHECK_IME_HAN_ENG ? BST_CHECKED : BST_UNCHECKED);
	CheckDlgButton (IDC_CHECK_RELEASE_ALL_KEY,	g_ini.macroOptions.RELEASE_ALL_KEYS  ? BST_CHECKED : BST_UNCHECKED);

	// 파일에서 매크로를 불러와 리스트 컨트롤에 표시한다.
	LoadMacros (g_ini.macroFileName);

	_listMacros.ResetContent();
	for (unsigned int i=0; i<g_macros.size(); ++i) {
		_listMacros.InsertString (i, g_macros[i].name);
	}
	if (0 < g_macros.size()) {
		_listMacros.SetCurSel (0);
	}

	SetTextRecCount();

	// 버젼 정보와 홈페이지 하이퍼링크 표시
	SetDlgItemText (IDC_STATIC_VERSION, GetVersionInfo("ProductVersion"));

	_staticHomepage.SetURL("https://blog.naver.com/pg365/223003862895");
	_staticHomepage.SetToolTipText("키보드/마우스 매크로 프로그램 V1 (쉬운 버전)");
	_staticHomepage.SetLinkCursor(::LoadCursor(0, MAKEINTRESOURCE(IDC_HAND)));

	// 키보드/마우스 이벤트 훅 설치
	const int RID_size = 2;
	RAWINPUTDEVICE rid[RID_size];
	ZeroMemory (rid, sizeof(RAWINPUTDEVICE)*RID_size);

	// 키보드
	rid[0].usUsagePage = 0x01;
	rid[0].usUsage = 0x06;
	rid[0].dwFlags = RIDEV_INPUTSINK;
	rid[0].hwndTarget = m_hWnd;

	// 마우스
	rid[1].usUsagePage = 0x01;
	rid[1].usUsage = 0x02;
	rid[1].dwFlags = RIDEV_INPUTSINK;
	rid[1].hwndTarget = m_hWnd;    //    메시지를 처리할 프로시져의 윈도우 핸들

	if (!RegisterRawInputDevices (rid, RID_size, sizeof(RAWINPUTDEVICE))) {
		TRACE ("RegisterRawInputDevices Failed");
	}

	return TRUE;  // 포커스를 컨트롤에 설정하지 않으면 TRUE를 반환합니다.
}

void Ckey_macroDlg::OnPaint()
{
	if (IsIconic()) {
		CPaintDC dc(this); // 그리기를 위한 디바이스 컨텍스트

		SendMessage(WM_ICONERASEBKGND, reinterpret_cast<WPARAM>(dc.GetSafeHdc()), 0);

		// 클라이언트 사각형에서 아이콘을 가운데에 맞춥니다.
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// 아이콘을 그립니다.
		dc.DrawIcon(x, y, m_hIcon);
	}
	else {
		CDialog::OnPaint();
	}
}

HCURSOR Ckey_macroDlg::OnQueryDragIcon()
{
	return static_cast<HCURSOR>(m_hIcon);
}

void Ckey_macroDlg::OnDestroy()
{
	// 다음 실행에 매크로 프로그램의 위치를 복원하기 위해 현재 위치를 저장해 둔다.
	GetWindowsPos (g_ini.windowSX, g_ini.windowSY);

	CDialog::OnDestroy();
}

void Ckey_macroDlg::OnRawInput(UINT nInputcode, HRAWINPUT hRawInput)
{
	// This feature requires Windows XP or greater.
	// The symbol _WIN32_WINNT must be >= 0x0501.

	RAWINPUT rawInput;
    ZeroMemory (&rawInput, sizeof(RAWINPUT));
    
	UINT unSize = sizeof(RAWINPUT);
    ::GetRawInputData ((HRAWINPUT)hRawInput, RID_INPUT, &rawInput, &unSize, sizeof(RAWINPUTHEADER));

	switch (rawInput.header.dwType) {
    case RIM_TYPEKEYBOARD:
		OnRawKeyboard (rawInput.data.keyboard);
        break;
	case RIM_TYPEMOUSE: 
		OnRawMouse (rawInput.data.mouse);
		break; 
    case RIM_TYPEHID:
        break;
    default:
        break;
    }

	CDialog::OnRawInput(nInputcode, hRawInput);
}

void Ckey_macroDlg::OnTimer(UINT_PTR nIDEvent)
{
	if (nIDEvent == 1001) {
		DWORD current_time = GetTickCount ();
		AllMacroStep (current_time - _macro_exec_time);
		_macro_exec_time = current_time;
	}
	else if (nIDEvent == 1002) {
		for (unsigned int i=0; i<g_macros.size(); ++i) {
			_listMacros2.SetSel (i, g_macros[i].is_running());
		}
	}

	CDialog::OnTimer(nIDEvent);
}

void Ckey_macroDlg::OnKeybdMouseEvent (BYTE vk_code, bool vk_pressed)
{
	if (vk_code == g_ini.keyMacroRun && vk_pressed == true) {
		if (IsDlgButtonChecked (IDC_RADIO_MACRO_EDIT) == BST_CHECKED) {
			CheckDlgButton (IDC_RADIO_MACRO_RUN, BST_CHECKED);
			CheckDlgButton (IDC_RADIO_MACRO_EDIT, BST_UNCHECKED);

			OnBnClickedRadioRun();
		}
		else if (IsDlgButtonChecked (IDC_RADIO_MACRO_RUN) == BST_CHECKED) {
			CheckDlgButton (IDC_RADIO_MACRO_RUN, BST_UNCHECKED);
			CheckDlgButton (IDC_RADIO_MACRO_EDIT, BST_CHECKED);

			OnBnClickedRadioEdit();
		}
	}
	// 매크로의 시작과 중지는 여기서만 하도록 한다.
	// 즉, key_macroDlg 창이 활성화 되어 있을 때만 처리한다.
	MacroStartStopShortkey (vk_code, vk_pressed);
}

void Ckey_macroDlg::OnBnClickedButtonMacroFile()
{
	if (_macro_changed) {
		int ret = AfxMessageBox ("매크로가 변경되었습니다. 저장할까요?", MB_YESNO|MB_ICONQUESTION);
		if (ret == IDYES) {
			OnBnClickedButtonSave ();
		}
	}

	///////////////////////////////////////////////////////////////////////////////
	char szFilter[] = "Macro file (*.m)|*.m|All Files(*.*)|*.*||";
	CFileDialog dlg(TRUE, NULL, g_ini.macroFileName, OFN_HIDEREADONLY, szFilter);
	
	if(IDOK == dlg.DoModal()) {
		char curPath[MAX_PATH+1] = "";
		GetCurrentDirectory (MAX_PATH, curPath);
		curPath[MAX_PATH] = '\0';

		CString fileNameNew = "";

		// 파일의 경로가 현재 작업경로와 일치하면, 작업경로는 삭제한다.
		if (strnicmp(curPath, (LPCSTR)dlg.GetPathName (), strlen(curPath)) == 0) {
			fileNameNew = (LPCSTR)dlg.GetPathName () + strlen(curPath) + 1;
		}
		else {
			fileNameNew = dlg.GetPathName();
		}
		// 확장자가 없으면 ".m" 확장자를 붙인다.
		if (dlg.GetFileExt ().GetLength () == 0) {
			fileNameNew += ".m";
		}

		// 파일에 저장된 매크로 새로 불러온다.
		LoadMacros ((LPCSTR)fileNameNew);

		// 윈도우에 매크로 목록 표시
		_listMacros.ResetContent();
		for (unsigned int i=0; i<g_macros.size(); ++i) {
			_listMacros.InsertString (i, g_macros[i].name);
		}
		_listMacros.SetCurSel(0);

		// 매크로 파일 이름 표시
		strncpy (g_ini.macroFileName, (LPCSTR)fileNameNew, MAX_PATH);
		g_ini.macroFileName[MAX_PATH] = '\0';
		SetDlgItemText (IDC_EDIT_MACRO_FILE, g_ini.macroFileName);
	}
}

void Ckey_macroDlg::EnableDlgItem(BOOL enable)
{
	GetDlgItem (IDC_COMBO_KEY)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_REC_MACRO)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_ADD_MACRO)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_EDIT_MACRO)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_COPY_MACRO)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_DELETE_MACRO)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_MACRO_FILE)->EnableWindow (enable);
	GetDlgItem (IDC_EDIT_EVENT_MIN_DELAY)->EnableWindow (enable);
	GetDlgItem (IDC_CHECK_IME_HAN_ENG)->EnableWindow (enable);
	GetDlgItem (IDC_CHECK_RELEASE_ALL_KEY)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_UP)->EnableWindow (enable);
	GetDlgItem (IDC_BUTTON_DOWN)->EnableWindow (enable);
}

void Ckey_macroDlg::OnBnClickedOk()
{
	// Alt+F4, Esc 키에 의해 윈도우 종료되는 것 방지

	// OnOK();
}

void Ckey_macroDlg::OnBnClickedCancel()
{
	// Alt+F4, Esc 키에 의해 윈도우 종료되는 것 방지

	// OnCancel();
}

void Ckey_macroDlg::OnBnClickedRadioRun()
{
	if (g_macros.size() == 0) {
		AfxMessageBox ("기록된 매크로가 없습니다.");
		return;
	}

	if (IsDlgButtonChecked (IDC_RADIO_MACRO_RUN) == BST_CHECKED) {
		// 매크로 실행 대기 상태로 바뀜
		MacroInit ();
		EnableDlgItem (FALSE);
		
		_listMacros2.ResetContent();

		// 매크로 목록에 시작/중지 조건 표시
		for (unsigned int i=0; i<g_macros.size(); ++i) {
			char buff[256+1];
			_snprintf (buff, 256, "%s (%s%s / %s%s)", 
				g_macros[i].name, 
				GetVkNameFromVK (g_macros[i].start_key & 0xFF),  
				(g_macros[i].start_key & VK_KEY_UP) ? "뗌" : "누름",
				GetVkNameFromVK (g_macros[i].stop_key  & 0xFF),
				(g_macros[i].stop_key  & VK_KEY_UP) ? "뗌" : "누름");
			buff[256] = '\0';

			_listMacros2.InsertString (i, buff);
		}

		_listMacros.ShowWindow (SW_HIDE);
		_listMacros2.ShowWindow (SW_SHOW);

		g_ini.eventDelay = GetDlgItemInt (IDC_EDIT_EVENT_MIN_DELAY, NULL, FALSE);
		g_ini.eventDelay = BOUND (g_ini.eventDelay, 1, 100000);

		// 매크로를 실행하도록 타이머 시작
		_macro_exec_time = GetTickCount ();
		SetTimer (1001, g_ini.eventDelay, NULL);	// 매크로를 실행하기 위한 타이머
		SetTimer (1002, 33, NULL);					// 실행되는 매크로를 리스트 박스에 표시하기 위한 타이머
	}
}

void Ckey_macroDlg::OnBnClickedRadioEdit()
{
	if (IsDlgButtonChecked (IDC_RADIO_MACRO_EDIT) == BST_CHECKED) {
		// 매크로 편집 상태로 바뀜
		MacroTerm ();

		EnableDlgItem (TRUE);

		_listMacros.ShowWindow (SW_SHOW);
		_listMacros2.ShowWindow (SW_HIDE);

		KillTimer (1001);
		KillTimer (1002);
	}
}

void Ckey_macroDlg::OnCbnSelchangeComboKey()
{
	int index = SendDlgItemMessage (IDC_COMBO_KEY, CB_GETCURSEL, 0, 0);
	if (index != -1) {
		g_ini.keyMacroRun = GetVkCode(index);
	}
}

void Ckey_macroDlg::SetTextRecCount()
{
	char text[256];

	sprintf (text, "%d개 매크로가 기록됨.", g_macros.size());

	SetDlgItemText (IDC_STATIC_REC_COUNT, text);
}

void Ckey_macroDlg::OnBnClickedButtonAddMacro()
{
	CDialogMacroEdit dlg;

	// 추가할 매크로를 temp로 만들고 추가(편집) 대화상자에 넘겨준다.
	// 추가 대화상자에서 OK 버튼이 눌리면 g_macros에 편집된 매크로(temp)를 추가한다.
	sMacro temp;
	dlg._macro = &temp;

	if (dlg.DoModal () == IDOK) {
		int count = _listMacros.GetCount ();

		_listMacros.InsertString (count, temp.name);
		_listMacros.SetCurSel (count);

		g_macros.push_back (temp);
		_macro_changed = true;
	}

	SetTextRecCount();
}

void Ckey_macroDlg::OnBnClickedButtonEditMacro()
{
	int sel = _listMacros.GetCurSel ();
	if (sel < 0) return;

	CDialogMacroEdit dlg;

	// 매크로를 편집할 때는, 편집하고자 하는 매크로를 temp로 복사하여 편집 대화상자로 넘겨준다.
	// 편집 대화상자에서 OK 버튼이 눌리면 편집된 매크로(temp)를 g_macros에 기록된 매크로에 덮어쓴다.
	sMacro temp = g_macros[sel];
	dlg._macro = &temp;

	if (dlg.DoModal () == IDOK) {
		_listMacros.DeleteString (sel);
		_listMacros.InsertString (sel, temp.name);
		_listMacros.SetCurSel (sel);

		g_macros[sel] = *dlg._macro;
		_macro_changed = true;
	}
}

void Ckey_macroDlg::OnBnClickedButtonRecMacro()
{
	CDialogMacroRec dlg;

	// 먼저 temp 매크로를 만들어, 여기다 매크로를 기록한다.
	// 기록 대화상자에서 OK가 눌리면 temp에 기록된 매크로를 g_macros에 추가한다.
	sMacro temp;
	dlg._macro = &temp;

	if (dlg.DoModal () == IDOK) {
		int count = _listMacros.GetCount ();

		_listMacros.InsertString (count, temp.name);
		_listMacros.SetCurSel (count);

		g_macros.push_back (temp);
		_macro_changed = true;
	}

	SetTextRecCount();
}

void Ckey_macroDlg::OnBnClickedButtonCopyMacro()
{
	int sel = _listMacros.GetCurSel ();
	if (sel < 0) return;

	int count = _listMacros.GetCount ();
	sMacro &macro = g_macros[sel];

	_listMacros.InsertString (count, macro.name);
	_listMacros.SetCurSel (count);

	g_macros.push_back (macro);
	_macro_changed = true;

	SetTextRecCount();
}

void Ckey_macroDlg::OnBnClickedButtonDeleteMacro()
{
	int sel = _listMacros.GetCurSel ();
	if (sel < 0) return;

	_listMacros.DeleteString (sel);
	_listMacros.SetCurSel (sel);

	g_macros.erase (g_macros.begin() + sel);
	_macro_changed = true;

	SetTextRecCount();
}

void Ckey_macroDlg::OnLbnDblclkListMacros()
{
	OnBnClickedButtonEditMacro();
}

void Ckey_macroDlg::OnBnClickedButtonUp()
{
	int sel = _listMacros.GetCurSel ();
	if (sel < 0) return;

	if (1 <= sel) {
	   _listMacros.DeleteString (sel);
	   _listMacros.InsertString (sel-1, g_macros[sel].name);
	   _listMacros.SetCurSel (sel-1);

	   std::swap (g_macros[sel], g_macros[sel-1]);
		_macro_changed = true;
	}
}

void Ckey_macroDlg::OnBnClickedButtonDown()
{
	int sel = _listMacros.GetCurSel ();
	if (sel < 0) return;

	if (sel < _listMacros.GetCount ()-1) { 
	   _listMacros.DeleteString (sel);
	   _listMacros.InsertString (sel+1, g_macros[sel].name);
	   _listMacros.SetCurSel (sel+1);

		std::swap (g_macros[sel], g_macros[sel+1]);
		_macro_changed = true;
	}
}

void Ckey_macroDlg::OnBnClickedButtonSave()
{
	// 매크로를 저장할 파일 이름을 가져오고, 매크로를 이 파일 이름으로 저장한다.
	GetDlgItemText (IDC_EDIT_MACRO_FILE, g_ini.macroFileName, MAX_PATH);
	g_ini.macroFileName[MAX_PATH] = '\0';
	
	SaveMacro (g_ini.macroFileName);
	_macro_changed = false;
}


void Ckey_macroDlg::OnBnClickedButtonQuit()
{
	// 설정값을 INI파일에 저장하기 위해 다이얼로그에 설정된 값을 가져온다.
	g_ini.eventDelay = GetDlgItemInt (IDC_EDIT_EVENT_MIN_DELAY, NULL, FALSE);
	g_ini.eventDelay = BOUND (g_ini.eventDelay, 1, 100000);

	// 매크로가 변경되었으면 저장 여부를 물어보고 저장한다.
	if (_macro_changed) {
		int ret = AfxMessageBox ("매크로가 변경되었습니다. 저장할까요?", MB_YESNO|MB_ICONQUESTION);
		if (ret == IDYES) {
			OnBnClickedButtonSave ();
		}
	}

	// 여기서 종료
	OnOK ();
}

void Ckey_macroDlg::OnBnClickedCheckImeHanEng()
{
	g_ini.macroOptions.CHECK_IME_HAN_ENG = (IsDlgButtonChecked (IDC_CHECK_IME_HAN_ENG) == BST_CHECKED) ? 1 : 0;
}

void Ckey_macroDlg::OnBnClickedCheckReleaseAllKey()
{
	g_ini.macroOptions.RELEASE_ALL_KEYS = (IsDlgButtonChecked (IDC_CHECK_RELEASE_ALL_KEY) == BST_CHECKED) ? 1 : 0;
}
