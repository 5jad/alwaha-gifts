/**
 * Google Apps Script Web App for Al-Waha Lil-Hidaya Wall Clocks Orders
 * 
 * Deployment Instructions:
 * 1. Open Google Sheets > Extensions > Apps Script
 * 2. Paste this code into Code.gs
 * 3. Set your SHEETS_SECRET in Project Settings > Script Properties (SHEETS_SECRET = your_token)
 * 4. Click Deploy > New deployment > Select type: Web app
 *    - Description: Al-Waha Lil-Hidaya Orders Webhook
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the Web app URL and set it as SHEETS_WEBHOOK_URL in .dev.vars / Cloudflare secrets
 */

var CONFIG = {
  SECRET_PROP_NAME: "SHEETS_SECRET",
  DEFAULT_SECRET: "alwaha-secure-token-2026",
  SHEET_NAME: "الطلبات", // Orders sheet name
  HEADERS: [
    "Order ID",
    "Date",
    "Time",
    "Name",
    "Phone",
    "Governorate",
    "Address",
    "Product",
    "Model",
    "Color",
    "Qty",
    "Unit Price IQD",
    "Total IQD",
    "Status",
    "Source URL",
    "UTM source",
    "UTM campaign"
  ]
};

/**
 * Neutralizes spreadsheet formula injection (CSV/Spreadsheet Injection).
 * Any string value beginning with =, +, -, @, Tab, or Carriage Return
 * is prepended with a single quote (') so spreadsheets treat it strictly as text.
 */
function sanitizeCell(val) {
  if (val === null || val === undefined) return "";
  var str = String(val);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function getSecret() {
  try {
    var propSecret = PropertiesService.getScriptProperties().getProperty(CONFIG.SECRET_PROP_NAME);
    if (propSecret && propSecret.trim().length > 0) {
      return propSecret.trim();
    }
  } catch (err) {
    Logger.log("ScriptProperties error: " + err);
  }
  return CONFIG.DEFAULT_SECRET;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent requests
  var hasLock = lock.tryLock(30000);
  if (!hasLock) {
    return jsonResponse({ success: false, error: "Server busy, could not acquire lock" }, 503);
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty request body" }, 400);
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return jsonResponse({ success: false, error: "Invalid JSON format" }, 400);
    }

    // Validate shared secret (Strict: Fail closed if secret missing)
    var expectedSecret = getSecret();
    if (!expectedSecret || !payload.secret || payload.secret !== expectedSecret) {
      return jsonResponse({ success: false, error: "Unauthorized: Invalid or missing secret" }, 401);
    }

    var order = payload.order;
    if (!order || !order.id) {
      return jsonResponse({ success: false, error: "Missing order or order.id" }, 400);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    }

    // Ensure header row exists
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(CONFIG.HEADERS);
      var headerRange = sheet.getRange(1, 1, 1, CONFIG.HEADERS.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#2c3e50");
      headerRange.setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }

    // Idempotency check: verify if Order ID already exists in Column 1
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingIds = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < existingIds.length; i++) {
        if (String(existingIds[i][0]).trim() === String(order.id).trim()) {
          return jsonResponse({
            success: true,
            duplicated: true,
            orderId: order.id,
            message: "Order already recorded previously"
          }, 200);
        }
      }
    }

    // Append new order row with formula injection protection
    var formattedPhone = "'" + (order.phone || "");

    var newRow = [
      sanitizeCell(order.id),
      sanitizeCell(order.date),
      sanitizeCell(order.time),
      sanitizeCell(order.customerName),
      formattedPhone,
      sanitizeCell(order.governorate),
      sanitizeCell(order.address),
      sanitizeCell(order.productName || "ساعة حائط فاخرة"),
      sanitizeCell(order.modelName),
      sanitizeCell(order.colorName),
      Number(order.quantity) || 1,
      Number(order.unitPrice) || 0,
      Number(order.totalPrice) || 0,
      sanitizeCell(order.status || "جديد - قيد التجهيز"),
      sanitizeCell(order.sourceUrl),
      sanitizeCell(order.utmSource),
      sanitizeCell(order.utmCampaign)
    ];

    sheet.appendRow(newRow);

    return jsonResponse({
      success: true,
      duplicated: false,
      orderId: order.id,
      row: sheet.getLastRow()
    }, 200);

  } catch (error) {
    Logger.log("doPost error: " + error.toString());
    return jsonResponse({ success: false, error: error.toString() }, 500);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return jsonResponse({
    status: "ok",
    service: "Al-Waha Lil-Hidaya Orders Webhook",
    time: new Date().toISOString()
  }, 200);
}

function jsonResponse(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
