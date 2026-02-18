#pragma once

class CDialogCommon : public CDialog
{
public:
	CDialogCommon(UINT nIDTemplate, CWnd* pParent = NULL);
	virtual ~CDialogCommon();

protected:
	double GetDlgItemDouble (int nIDDlgItem);
	void SetDlgItemDouble (int nIDDlgItem, double value);

	void FillComboBoxVkList (int nIDDlgItem, int select_vk);

	void DlgInScreen (int &sx, int &sy);
	void GetWindowsPos (int &sx, int &sy);
};
