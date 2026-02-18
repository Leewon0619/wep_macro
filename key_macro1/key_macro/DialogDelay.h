#pragma once
#include "macro_def.h"
#include "DialogCommon.h"

class CDialogDelay : public CDialogCommon
{
	DECLARE_DYNAMIC(CDialogDelay)

public:
	CDialogDelay(CWnd* pParent = NULL);   // standard constructor
	virtual ~CDialogDelay();

	enum { IDD = IDD_DIALOG_ADD_DELAY };

	sMacroItem _item;

protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV support

	DECLARE_MESSAGE_MAP()
	virtual BOOL OnInitDialog();
	afx_msg void OnBnClickedOk();
};
