#pragma once
#include "macro_def.h"
#include "DialogCommon.h"

class CDialogKeyboard : public CDialogCommon
{
	DECLARE_DYNAMIC(CDialogKeyboard)

public:
	CDialogKeyboard(CWnd* pParent = NULL);   // standard constructor
	virtual ~CDialogKeyboard();

	enum { IDD = IDD_DIALOG_ADD_KEY };

	BYTE _vk_input;
	sMacroItem _item;

	void OnKeybdEvent (BYTE vk_code, bool vk_pressed);

protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support

	DECLARE_MESSAGE_MAP()
	virtual BOOL OnInitDialog();
	afx_msg void OnBnClickedOk();
	afx_msg void OnTimer(UINT_PTR nIDEvent);
};
