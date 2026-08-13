#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <commctrl.h>
#include <d2d1.h>
#include <dwrite.h>
#include <pdh.h>
#include <string>
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>
#include <cmath>

// Windhawk API header (assumed to be provided by the environment)
#include <windhawk_api.h>

#pragma comment(lib, "d2d1.lib")
#pragma comment(lib, "dwrite.lib")
#pragma comment(lib, "pdh.lib")
#pragma comment(lib, "comctl32.lib")

// --- Global State ---
ID2D1Factory* g_pD2DFactory = nullptr;
IDWriteFactory* g_pDWriteFactory = nullptr;
IDWriteTextFormat* g_pTextFormat = nullptr;
IDWriteTextFormat* g_pIconFormat = nullptr;

struct MetricsData {
    float cpuUsage = 0.0f;
    float ramUsage = 0.0f;
    float gpuUsage = 9.0f; // Stubbed
    float tempC = 57.0f;   // Stubbed
    wchar_t timeStr[32] = {0};
    wchar_t dateStr[32] = {0};
};

MetricsData g_metrics;
std::mutex g_metricsMutex;
std::atomic<bool> g_running{false};
std::thread g_metricsThread;
std::vector<HWND> g_clockHwnds;
std::mutex g_hwndMutex;

// PDH Query
PDH_HQUERY g_pdhQuery = NULL;
PDH_HCOUNTER g_pdhCpuCounter = NULL;

// --- D2D Resource Management per HWND ---
struct D2DResources {
    ID2D1HwndRenderTarget* pRT = nullptr;
    ID2D1SolidColorBrush* pBgBrush = nullptr;
    ID2D1LinearGradientBrush* pCpuTextBrush = nullptr;
    ID2D1LinearGradientBrush* pCpuBarBrush = nullptr;
    ID2D1LinearGradientBrush* pRamTextBrush = nullptr;
    ID2D1LinearGradientBrush* pRamBarBrush = nullptr;
    ID2D1LinearGradientBrush* pGpuTextBrush = nullptr;
    ID2D1LinearGradientBrush* pGpuBarBrush = nullptr;
    ID2D1LinearGradientBrush* pTimeTextBrush = nullptr;
    ID2D1LinearGradientBrush* pDateTextBrush = nullptr;
    ID2D1LinearGradientBrush* pTempTextBrush = nullptr;
    // Temp bar brush is recreated dynamically based on value

    void Discard() {
        if (pTempTextBrush) { pTempTextBrush->Release(); pTempTextBrush = nullptr; }
        if (pDateTextBrush) { pDateTextBrush->Release(); pDateTextBrush = nullptr; }
        if (pTimeTextBrush) { pTimeTextBrush->Release(); pTimeTextBrush = nullptr; }
        if (pGpuBarBrush) { pGpuBarBrush->Release(); pGpuBarBrush = nullptr; }
        if (pGpuTextBrush) { pGpuTextBrush->Release(); pGpuTextBrush = nullptr; }
        if (pRamBarBrush) { pRamBarBrush->Release(); pRamBarBrush = nullptr; }
        if (pRamTextBrush) { pRamTextBrush->Release(); pRamTextBrush = nullptr; }
        if (pCpuBarBrush) { pCpuBarBrush->Release(); pCpuBarBrush = nullptr; }
        if (pCpuTextBrush) { pCpuTextBrush->Release(); pCpuTextBrush = nullptr; }
        if (pBgBrush) { pBgBrush->Release(); pBgBrush = nullptr; }
        if (pRT) { pRT->Release(); pRT = nullptr; }
    }
};

ID2D1LinearGradientBrush* CreateLinearGradientBrush(ID2D1HwndRenderTarget* pRT, D2D1_COLOR_F color1, D2D1_COLOR_F color2) {
    ID2D1GradientStopCollection* pStops = nullptr;
    D2D1_GRADIENT_STOP stops[2];
    stops[0].color = color1;
    stops[0].position = 0.0f;
    stops[1].color = color2;
    stops[1].position = 1.0f;
    
    pRT->CreateGradientStopCollection(stops, 2, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP, &pStops);
    
    ID2D1LinearGradientBrush* pBrush = nullptr;
    if (pStops) {
        D2D1_LINEAR_GRADIENT_BRUSH_PROPERTIES props = D2D1::LinearGradientBrushProperties(
            D2D1::Point2F(0, 0), D2D1::Point2F(100, 0)); // Will be updated during drawing
        pRT->CreateLinearGradientBrush(props, pStops, &pBrush);
        pStops->Release();
    }
    return pBrush;
}

D2D1_COLOR_F HexToColorF(UINT32 hex) {
    float r = ((hex >> 16) & 0xFF) / 255.0f;
    float g = ((hex >> 8) & 0xFF) / 255.0f;
    float b = (hex & 0xFF) / 255.0f;
    return D2D1::ColorF(r, g, b, 1.0f);
}

void CreateDeviceResources(HWND hWnd, D2DResources* res) {
    if (res->pRT) return;

    RECT rc;
    GetClientRect(hWnd, &rc);
    D2D1_SIZE_U size = D2D1::SizeU(rc.right - rc.left, rc.bottom - rc.top);

    HRESULT hr = g_pD2DFactory->CreateHwndRenderTarget(
        D2D1::RenderTargetProperties(),
        D2D1::HwndRenderTargetProperties(hWnd, size),
        &res->pRT);

    if (SUCCEEDED(hr)) {
        res->pRT->CreateSolidColorBrush(HexToColorF(0x1A1A1A), &res->pBgBrush);
        
        // CPU
        res->pCpuTextBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x00BFFF), HexToColorF(0x0080FF));
        res->pCpuBarBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x00BFFF), HexToColorF(0x80FF00));
        // RAM
        res->pRamTextBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x0040FF), HexToColorF(0x0080FF));
        res->pRamBarBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x0040FF), HexToColorF(0xFF0080));
        // GPU
        res->pGpuTextBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x8000FF), HexToColorF(0xFF00FF));
        res->pGpuBarBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x00FF00), HexToColorF(0x808000));
        // Time
        res->pTimeTextBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x800000), HexToColorF(0xFF4000));
        // Date
        res->pDateTextBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0xCC9900), HexToColorF(0xFFCC00));
        // Temp
        res->pTempTextBrush = CreateLinearGradientBrush(res->pRT, HexToColorF(0x0080FF), HexToColorF(0x0040FF));
    }
}

// --- Drawing Logic ---
void DrawModule(D2DResources* res, D2D1_RECT_F rect, const wchar_t* icon, const wchar_t* text, ID2D1LinearGradientBrush* textBrush, float progress, ID2D1LinearGradientBrush* barBrush, bool hasBar) {
    if (!res->pRT) return;

    // Update gradient start/end points based on module rect
    if (textBrush) {
        textBrush->SetStartPoint(D2D1::Point2F(rect.left, rect.top));
        textBrush->SetEndPoint(D2D1::Point2F(rect.right, rect.bottom));
    }
    if (barBrush) {
        barBrush->SetStartPoint(D2D1::Point2F(rect.left, rect.top));
        barBrush->SetEndPoint(D2D1::Point2F(rect.right, rect.top));
    }

    // Icon (Left aligned)
    D2D1_RECT_F iconRect = rect;
    iconRect.right = iconRect.left + 20.0f;
    res->pRT->DrawTextW(icon, wcslen(icon), g_pIconFormat, iconRect, textBrush);

    // Text
    D2D1_RECT_F textRect = rect;
    textRect.left += 22.0f;
    textRect.right = hasBar ? textRect.left + 35.0f : rect.right;
    res->pRT->DrawTextW(text, wcslen(text), g_pTextFormat, textRect, textBrush);

    // Bar
    if (hasBar) {
        D2D1_RECT_F barBgRect = rect;
        barBgRect.left = textRect.right + 2.0f;
        barBgRect.top += 6.0f;
        barBgRect.bottom -= 6.0f;
        barBgRect.right -= 5.0f;
        
        ID2D1SolidColorBrush* pDarkBrush;
        res->pRT->CreateSolidColorBrush(D2D1::ColorF(0.1f, 0.1f, 0.1f, 1.0f), &pDarkBrush);
        res->pRT->FillRoundedRectangle(D2D1::RoundedRect(barBgRect, 2.0f, 2.0f), pDarkBrush);
        pDarkBrush->Release();

        float fillWidth = (barBgRect.right - barBgRect.left) * (progress / 100.0f);
        if (fillWidth > 0.0f) {
            D2D1_RECT_F barFillRect = barBgRect;
            barFillRect.right = barFillRect.left + fillWidth;
            res->pRT->FillRoundedRectangle(D2D1::RoundedRect(barFillRect, 2.0f, 2.0f), barBrush);
        }
    }
}

void DrawTempModule(D2DResources* res, D2D1_RECT_F rect, const wchar_t* text, float tempC) {
    // Dynamic Temperature Bar Gradient
    D2D1_COLOR_F color1 = HexToColorF(0x0080FF); // Blue (<50)
    D2D1_COLOR_F color2 = HexToColorF(0xFF8000); // Orange (50-60)
    D2D1_COLOR_F color3 = HexToColorF(0xFF0000); // Red (>80)

    ID2D1GradientStopCollection* pStops = nullptr;
    D2D1_GRADIENT_STOP stops[3];
    stops[0].color = color1; stops[0].position = 0.0f;
    stops[1].color = color2; stops[1].position = 0.6f;
    stops[2].color = color3; stops[2].position = 1.0f;
    
    res->pRT->CreateGradientStopCollection(stops, 3, D2D1_GAMMA_2_2, D2D1_EXTEND_MODE_CLAMP, &pStops);
    
    ID2D1LinearGradientBrush* pDynamicTempBarBrush = nullptr;
    if (pStops) {
        D2D1_LINEAR_GRADIENT_BRUSH_PROPERTIES props = D2D1::LinearGradientBrushProperties(
            D2D1::Point2F(rect.left, rect.top), D2D1::Point2F(rect.right, rect.top));
        res->pRT->CreateLinearGradientBrush(props, pStops, &pDynamicTempBarBrush);
        pStops->Release();
    }

    DrawModule(res, rect, L"\x2103", text, res->pTempTextBrush, min(tempC, 100.0f), pDynamicTempBarBrush, true);

    if (pDynamicTempBarBrush) pDynamicTempBarBrush->Release();
}

void OnPaint(HWND hWnd, D2DResources* res) {
    CreateDeviceResources(hWnd, res);
    if (!res->pRT) return;

    res->pRT->BeginDraw();
    res->pRT->Clear(D2D1::ColorF(0.0f, 0.0f, 0.0f, 0.0f)); // Transparent bg

    RECT rc;
    GetClientRect(hWnd, &rc);
    D2D1_RECT_F clientRect = D2D1::RectF(0, 0, (float)rc.right, (float)rc.bottom);
    
    // Background Pill
    res->pRT->FillRoundedRectangle(D2D1::RoundedRect(clientRect, 16.0f, 16.0f), res->pBgBrush);

    MetricsData data;
    {
        std::lock_guard<std::mutex> lock(g_metricsMutex);
        data = g_metrics;
    }

    float width = clientRect.right;
    float colW = width / 3.0f;
    float rowH = clientRect.bottom / 2.0f;

    wchar_t buf[32];
    
    // Row 1
    // CPU
    swprintf_s(buf, L"%02d%%", (int)data.cpuUsage);
    DrawModule(res, D2D1::RectF(10, 0, colW, rowH), L"\x2B21", buf, res->pCpuTextBrush, data.cpuUsage, res->pCpuBarBrush, true);
    // RAM
    swprintf_s(buf, L"%02d%%", (int)data.ramUsage);
    DrawModule(res, D2D1::RectF(colW, 0, colW * 2, rowH), L"\x25EB", buf, res->pRamTextBrush, data.ramUsage, res->pRamBarBrush, true);
    // GPU
    swprintf_s(buf, L"%02d%%", (int)data.gpuUsage);
    DrawModule(res, D2D1::RectF(colW * 2, 0, width - 10, rowH), L"\x2699", buf, res->pGpuTextBrush, data.gpuUsage, res->pGpuBarBrush, true);

    // Row 2
    // Time
    DrawModule(res, D2D1::RectF(10, rowH, colW, rowH * 2), L"\x23F2", data.timeStr, res->pTimeTextBrush, 0, nullptr, false);
    // Date
    DrawModule(res, D2D1::RectF(colW, rowH, colW * 2, rowH * 2), L"\x1F4C5", data.dateStr, res->pDateTextBrush, 0, nullptr, false);
    // Temp
    swprintf_s(buf, L"\x2248 %d\x00B0""C", (int)data.tempC);
    DrawTempModule(res, D2D1::RectF(colW * 2, rowH, width - 10, rowH * 2), buf, data.tempC);

    HRESULT hr = res->pRT->EndDraw();
    if (hr == D2DERR_RECREATE_TARGET) {
        res->Discard();
    }
}

// --- Subclass Procedure ---
LRESULT CALLBACK TrayClockSubclassProc(HWND hWnd, UINT uMsg, WPARAM wParam, LPARAM lParam, UINT_PTR uIdSubclass, DWORD_PTR dwRefData) {
    D2DResources* res = (D2DResources*)dwRefData;

    switch (uMsg) {
        case WM_PAINT: {
            PAINTSTRUCT ps;
            BeginPaint(hWnd, &ps);
            OnPaint(hWnd, res);
            EndPaint(hWnd, &ps);
            return 0; // Handled
        }
        case WM_SIZE:
        case WM_DISPLAYCHANGE:
            if (res) res->Discard();
            break;
        case WM_NCDESTROY:
            if (res) {
                res->Discard();
                delete res;
            }
            RemoveWindowSubclass(hWnd, TrayClockSubclassProc, uIdSubclass);
            {
                std::lock_guard<std::mutex> lock(g_hwndMutex);
                g_clockHwnds.erase(std::remove(g_clockHwnds.begin(), g_clockHwnds.end(), hWnd), g_clockHwnds.end());
            }
            break;
    }
    return DefSubclassProc(hWnd, uMsg, wParam, lParam);
}

// --- Threading & Hooks ---
typedef HWND(WINAPI* CreateWindowExW_t)(DWORD, LPCWSTR, LPCWSTR, DWORD, int, int, int, int, HWND, HMENU, HINSTANCE, LPVOID);
CreateWindowExW_t CreateWindowExW_Original;

void MetricsUpdateThread() {
    while (g_running) {
        MetricsData current;
        
        // CPU
        PDH_FMT_COUNTERVALUE counterVal;
        if (g_pdhCpuCounter && PdhCollectQueryData(g_pdhQuery) == ERROR_SUCCESS && 
            PdhGetFormattedCounterValue(g_pdhCpuCounter, PDH_FMT_DOUBLE, NULL, &counterVal) == ERROR_SUCCESS) {
            current.cpuUsage = (float)counterVal.doubleValue;
        }

        // RAM
        MEMORYSTATUSEX memInfo;
        memInfo.dwLength = sizeof(MEMORYSTATUSEX);
        if (GlobalMemoryStatusEx(&memInfo)) {
            current.ramUsage = (float)memInfo.dwMemoryLoad;
        }

        // Stubbed GPU/Temp
        current.gpuUsage = 9.0f;
        current.tempC = 57.0f;

        // Time / Date
        SYSTEMTIME st;
        GetLocalTime(&st);
        GetTimeFormatW(LOCALE_USER_DEFAULT, TIME_NOSECONDS, &st, L"hh:mm tt", current.timeStr, 32);
        GetDateFormatW(LOCALE_USER_DEFAULT, 0, &st, L"ddd dd MMM yyyy", current.dateStr, 32);

        {
            std::lock_guard<std::mutex> lock(g_metricsMutex);
            g_metrics = current;
        }

        // Invalidate all known HWNDs
        {
            std::lock_guard<std::mutex> lock(g_hwndMutex);
            for (HWND hWnd : g_clockHwnds) {
                if (IsWindow(hWnd)) {
                    RedrawWindow(hWnd, NULL, NULL, RDW_INVALIDATE | RDW_UPDATENOW);
                }
            }
        }

        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    }
}

void ApplySubclass(HWND hWnd) {
    std::lock_guard<std::mutex> lock(g_hwndMutex);
    if (std::find(g_clockHwnds.begin(), g_clockHwnds.end(), hWnd) == g_clockHwnds.end()) {
        D2DResources* res = new D2DResources();
        SetWindowSubclass(hWnd, TrayClockSubclassProc, 1, (DWORD_PTR)res);
        g_clockHwnds.push_back(hWnd);
    }
}

HWND WINAPI CreateWindowExW_Hook(DWORD dwExStyle, LPCWSTR lpClassName, LPCWSTR lpWindowName, DWORD dwStyle, int X, int Y, int nWidth, int nHeight, HWND hWndParent, HMENU hMenu, HINSTANCE hInstance, LPVOID lpParam) {
    HWND hWnd = CreateWindowExW_Original(dwExStyle, lpClassName, lpWindowName, dwStyle, X, Y, nWidth, nHeight, hWndParent, hMenu, hInstance, lpParam);
    if (hWnd && lpClassName && !IS_INTRESOURCE(lpClassName) && wcscmp(lpClassName, L"TrayClockWClass") == 0) {
        ApplySubclass(hWnd);
    }
    return hWnd;
}

BOOL CALLBACK EnumWindowsProc(HWND hWnd, LPARAM lParam) {
    wchar_t className[256];
    if (GetClassNameW(hWnd, className, 256) && wcscmp(className, L"TrayClockWClass") == 0) {
        ApplySubclass(hWnd);
    }
    // Also check children (recursive search for TrayClockWClass)
    EnumChildWindows(hWnd, [](HWND hChild, LPARAM) -> BOOL {
        wchar_t childClass[256];
        if (GetClassNameW(hChild, childClass, 256) && wcscmp(childClass, L"TrayClockWClass") == 0) {
            ApplySubclass(hChild);
        }
        return TRUE;
    }, 0);
    return TRUE;
}

// --- Windhawk Entry Points ---
BOOL Wh_ModInit() {
    // D2D Init
    if (FAILED(D2D1CreateFactory(D2D1_FACTORY_TYPE_SINGLE_THREADED, &g_pD2DFactory))) return FALSE;
    if (FAILED(DWriteCreateFactory(DWRITE_FACTORY_TYPE_SHARED, __uuidof(IDWriteFactory), (IUnknown**)&g_pDWriteFactory))) return FALSE;

    g_pDWriteFactory->CreateTextFormat(L"Segoe UI", NULL, DWRITE_FONT_WEIGHT_NORMAL, DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_STRETCH_NORMAL, 12.0f, L"en-us", &g_pTextFormat);
    g_pDWriteFactory->CreateTextFormat(L"Segoe UI Symbol", NULL, DWRITE_FONT_WEIGHT_NORMAL, DWRITE_FONT_STYLE_NORMAL, DWRITE_FONT_STRETCH_NORMAL, 14.0f, L"en-us", &g_pIconFormat);

    g_pTextFormat->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_LEADING);
    g_pTextFormat->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);
    g_pIconFormat->SetTextAlignment(DWRITE_TEXT_ALIGNMENT_LEADING);
    g_pIconFormat->SetParagraphAlignment(DWRITE_PARAGRAPH_ALIGNMENT_CENTER);

    // PDH Init
    PdhOpenQuery(NULL, 0, &g_pdhQuery);
    PdhAddEnglishCounter(g_pdhQuery, L"\\Processor(_Total)\\% Processor Time", 0, &g_pdhCpuCounter);
    PdhCollectQueryData(g_pdhQuery);

    // Thread Init
    g_running = true;
    g_metricsThread = std::thread(MetricsUpdateThread);
    g_metricsThread.detach();

    // Hooks
    Wh_SetFunctionHook((void*)CreateWindowExW, (void*)CreateWindowExW_Hook, (void**)&CreateWindowExW_Original);

    // Subclass existing clocks
    EnumWindows(EnumWindowsProc, 0);

    return TRUE;
}

void Wh_ModUninit() {
    g_running = false;
    // Note: detached thread will exit safely since we check g_running
    
    if (g_pdhQuery) PdhCloseQuery(g_pdhQuery);

    {
        std::lock_guard<std::mutex> lock(g_hwndMutex);
        for (HWND hWnd : g_clockHwnds) {
            if (IsWindow(hWnd)) {
                RemoveWindowSubclass(hWnd, TrayClockSubclassProc, 1);
                InvalidateRect(hWnd, NULL, TRUE);
            }
        }
        g_clockHwnds.clear();
    }

    Wh_RemoveFunctionHook((void*)CreateWindowExW);

    if (g_pTextFormat) { g_pTextFormat->Release(); g_pTextFormat = nullptr; }
    if (g_pIconFormat) { g_pIconFormat->Release(); g_pIconFormat = nullptr; }
    if (g_pDWriteFactory) { g_pDWriteFactory->Release(); g_pDWriteFactory = nullptr; }
    if (g_pD2DFactory) { g_pD2DFactory->Release(); g_pD2DFactory = nullptr; }
}
