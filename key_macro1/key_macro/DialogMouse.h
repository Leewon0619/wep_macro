#pragma once
#include "macro_def.h"
#include "DialogCommon.h"

class CDialogMouse : public CDialogCommon
{
	DECLARE_DYNAMIC(CDialogMouse)

public:
	CDialogMouse(CWnd* pParent = NULL);   // standard constructor
	virtual ~CDialogMouse();

	enum { IDD = IDD_DIALOG_ADD_MOUSE };

	sMacroItem _item;

	void OnKeybdEvent (BYTE vk_code, bool vk_pressed);
	void OnMouseEvent (int x, int y);

protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support

	DECLARE_MESSAGE_MAP()

	virtual BOOL OnInitDialog();
	afx_msg void OnBnClickedOk();
	afx_msg void OnBnClickedCheckAbspos();
	afx_msg void OnBnClickedCheckWheel();
	afx_msg void OnCbnSelchangeComboKey();
};
