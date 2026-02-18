#include "stdafx.h"
#include "virtual_key.h"
#include "DialogCommon.h"

CDialogCommon::CDialogCommon(UINT nIDTemplate, CWnd* pParent /*=NULL*/)
	: CDialog(nIDTemplate, pParent)
{
}

CDialogCommon::~CDialogCommon()
{
}

double CDialogCommon::GetDlgItemDouble (int nIDDlgItem)
{
	char text[256];

	GetDlgItemText (nIDDlgItem, text, 255);
	text[255] = 0;

	return strtod (text, NULL);
}

void CDialogCommon::SetDlgItemDouble (int nIDDlgItem, double value)
{
	char text[256];

	sprintf (text, "%0.3f", value);
	SetDlgItemText (nIDDlgItem, text);
}

void CDialogCommon::FillComboBoxVkList (int nIDDlgItem, int select_vk)
{
	SendDlgItemMessage (nIDDlgItem, CB_INITSTORAGE, 256, 100);
	SendDlgItemMessage (nIDDlgItem, WM_SETREDRAW, 0, 0);

	for (int i=0; i<255 && g_vkList[i].vk_code != -1; ++i) {
		SendDlgItemMessage (nIDDlgItem, CB_INSERTSTRING, i, (LPARAM)GetVkDesc(i));
	}

	SendDlgItemMessage (nIDDlgItem, CB_SETCURSEL, GetVkIndex (select_vk));
	SendDlgItemMessage (nIDDlgItem, WM_SETREDRAW, 1, 0);
}

void CDialogCommon::DlgInScreen (int &sx, int &sy)
{
	// 메인 윈도우가 시작될 때, 화면을 벗어나 있으면 화면 안으로 옮긴다.
	RECT rect;
	GetWindowRect (&rect);

	int cxscreen = GetSystemMetrics(SM_CXVIRTUALSCREEN) - (rect.right - rect.left) - 1;
	int cyscreen = GetSystemMetrics(SM_CYVIRTUALSCREEN) - (rect.bottom - rect.top) - 1;

	if (sx < 0) sx = 0;
	if (sx > cxscreen) sx = cxscreen;

	if (sy < 0) sy = 0;
	if (sy > cyscreen) sy = cyscreen;
}

void CDialogCommon::GetWindowsPos (int &sx, int &sy)
{
	RECT rect;
	GetWindowRect (&rect);

	sx = rect.left;
	sy = rect.top;
}