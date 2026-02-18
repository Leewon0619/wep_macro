#include "stdafx.h"
#include "macro_def.h"


void LoadMacros (const char *macroFileName)
{
	FILE *fp = fopen (macroFileName, "rb");
	if (!fp) return;

	g_macros.clear ();

	long c = 0;
	fread (&c, sizeof(long), 1, fp);

	g_macros.resize(c);
	for (int i=0; i<c; ++i) {
		sMacro &m = g_macros[i];

		fread (m.name,       sizeof(char), 256, fp);
		fread (&m.start_key, sizeof(long), 1, fp);
		fread (&m.stop_key,  sizeof(long), 1, fp);
		fread (&m.repeat_cnt,sizeof(long), 1, fp);
		
		long d = 0;
		fread (&d, sizeof(long), 1, fp);

		m._item.resize (d);
		for (int j=0; j<d; ++j) {
			fread (&m._item[j], sizeof(sMacroItem), 1, fp);
		}
	}
	fclose (fp);
}

void SaveMacro (const char *macroFileName)
{
	FILE *fp = fopen (macroFileName, "wb");
	if (!fp) return;

	long c = g_macros.size();
	fwrite (&c, sizeof(long), 1, fp);

	for (int i=0; i<c; ++i) {
		sMacro &m = g_macros[i];

		fwrite (m.name,       sizeof(char), 256, fp);
		fwrite (&m.start_key, sizeof(long), 1, fp);
		fwrite (&m.stop_key,  sizeof(long), 1, fp);
		fwrite (&m.repeat_cnt,sizeof(long), 1, fp);
		
		long d = m._item.size();
		fwrite (&d, sizeof(long), 1, fp);

		for (int j=0; j<d; ++j) {
			fwrite (&m._item[j], sizeof(sMacroItem), 1, fp);
		}
	}
	fclose (fp);
}

