// selectThumbnail.mjs - Complete Fixed Version with Safe Switching
import { UpdateCommand, GetCommand } from "../../db/commands.mjs";
import docClient from "../../docClient.mjs";

const TABLE_NAME = process.env.DOC_ASSETS_TABLE_NAME;

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { assetId, selectedThumbnail, thumbnailType } = body;
    
    if (!assetId || !selectedThumbnail) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          error: "assetId and selectedThumbnail are required" 
        }),
      };
    }

    console.log(`📸 Selecting thumbnail for asset: ${assetId}`);
    console.log(`🎯 Selected thumbnail:`, selectedThumbnail);
    console.log(`🔄 Thumbnail type:`, thumbnailType || "not specified");

    // ✅ First, get the current asset to check its structure
    const getCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: { assetId }
    });

    const result = await docClient.send(getCommand);
    const asset = result.Item;

    if (!asset) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Asset not found" }),
      };
    }

    // ✅ Handle switching from custom to auto thumbnail
    const switchingToAuto = thumbnailType === "auto" && asset.videoMetadata?.hasCustomThumbnail;
    const switchingToCustom = thumbnailType === "custom";
    
    if (switchingToAuto) {
      console.log("🔄 Switching from custom to auto thumbnail");
    }
    if (switchingToCustom) {
      console.log("🔄 Switching to custom thumbnail");
    }

    // ✅ Prepare update based on current state and target type
    let updateExpression;
    let expressionAttributeValues;
    let expressionAttributeNames = {};

    if (!asset.videoMetadata) {
      // Create complete videoMetadata structure if it doesn't exist
      console.log("🔧 Creating videoMetadata structure...");
      
      updateExpression = `
        SET videoMetadata = :videoMetadata,
            previewUrl = :previewUrl,
            updatedAt = :updatedAt
      `;
      
      expressionAttributeValues = {
        ":videoMetadata": {
          hasAutoThumbnail: thumbnailType !== "custom",
          hasCustomThumbnail: thumbnailType === "custom",
          thumbnailGenerationStatus: "completed",
          thumbnailGenerationError: null,
          thumbnailType: thumbnailType || "auto-multiple",
          selectedThumbnail: {
            ...selectedThumbnail,
            isSelected: true,
            type: thumbnailType || "auto",
            updatedAt: new Date().toISOString()
          },
          autoThumbnails: [],
          customThumbnail: thumbnailType === "custom" ? {
            ...selectedThumbnail,
            isActive: true
          } : null
        },
        ":previewUrl": selectedThumbnail.url,
        ":updatedAt": new Date().toISOString()
      };
    } else {
      // ✅ Update existing videoMetadata with safe path handling
      console.log("🔧 Updating existing videoMetadata structure...");
      
      if (switchingToAuto) {
        // Switching from custom back to auto - use conditional update
        updateExpression = `
          SET #vm.#st = :selectedThumbnail,
              #vm.#tt = :thumbType,
              #vm.#hc = :hasCustom,
              #purl = :previewUrl,
              #upd = :updatedAt
        `;
        
        // ✅ Only update customThumbnail.isActive if it exists
        if (asset.videoMetadata.customThumbnail) {
          updateExpression += `, #vm.#ct.#ia = :inactive`;
          expressionAttributeNames["#ct"] = "customThumbnail";
          expressionAttributeNames["#ia"] = "isActive";
          expressionAttributeValues = {
            ":selectedThumbnail": {
              ...selectedThumbnail,
              isSelected: true,
              type: "auto",
              updatedAt: new Date().toISOString()
            },
            ":thumbType": "auto-multiple",
            ":hasCustom": false,
            ":inactive": false,
            ":previewUrl": selectedThumbnail.url,
            ":updatedAt": new Date().toISOString()
          };
        } else {
          // CustomThumbnail doesn't exist, just update main fields
          expressionAttributeValues = {
            ":selectedThumbnail": {
              ...selectedThumbnail,
              isSelected: true,
              type: "auto",
              updatedAt: new Date().toISOString()
            },
            ":thumbType": "auto-multiple",
            ":hasCustom": false,
            ":previewUrl": selectedThumbnail.url,
            ":updatedAt": new Date().toISOString()
          };
        }

        // Set expression attribute names
        expressionAttributeNames = {
          ...expressionAttributeNames,
          "#vm": "videoMetadata",
          "#st": "selectedThumbnail",
          "#tt": "thumbnailType",
          "#hc": "hasCustomThumbnail",
          "#purl": "previewUrl",
          "#upd": "updatedAt"
        };

      } else if (switchingToCustom) {
        // Switching to custom thumbnail
        updateExpression = `
          SET videoMetadata.selectedThumbnail = :selectedThumbnail,
              videoMetadata.thumbnailType = :thumbType,
              videoMetadata.hasCustomThumbnail = :hasCustom,
              videoMetadata.customThumbnail = :customThumbnail,
              previewUrl = :previewUrl,
              updatedAt = :updatedAt
        `;
        
        expressionAttributeValues = {
          ":selectedThumbnail": {
            ...selectedThumbnail,
            isSelected: true,
            type: "custom",
            updatedAt: new Date().toISOString()
          },
          ":thumbType": "custom",
          ":hasCustom": true,
          ":customThumbnail": {
            ...selectedThumbnail,
            isActive: true,
            type: "custom"
          },
          ":previewUrl": selectedThumbnail.url,
          ":updatedAt": new Date().toISOString()
        };
      } else {
        // Default: Selecting auto thumbnail (no switching)
        updateExpression = `
          SET videoMetadata.selectedThumbnail = :selectedThumbnail,
              previewUrl = :previewUrl,
              updatedAt = :updatedAt
        `;
        
        expressionAttributeValues = {
          ":selectedThumbnail": {
            ...selectedThumbnail,
            isSelected: true,
            type: thumbnailType || "auto",
            updatedAt: new Date().toISOString()
          },
          ":previewUrl": selectedThumbnail.url,
          ":updatedAt": new Date().toISOString()
        };
      }
    }

    // ✅ Execute the update with conditional attribute names
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { assetId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...(Object.keys(expressionAttributeNames).length > 0 && {
        ExpressionAttributeNames: expressionAttributeNames
      })
    });

    await docClient.send(updateCommand);

    console.log("✅ Thumbnail selection updated successfully");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Thumbnail selection updated successfully",
        assetId,
        selectedThumbnail: {
          ...selectedThumbnail,
          isSelected: true,
          type: thumbnailType || "auto"
        },
        previewUrl: selectedThumbnail.url,
        thumbnailInfo: {
          type: thumbnailType || "auto",
          switched: switchingToAuto ? "custom-to-auto" : (switchingToCustom ? "auto-to-custom" : null),
          hasAutoThumbnails: asset.videoMetadata?.autoThumbnails?.length > 0,
          hasCustomThumbnail: thumbnailType === "custom" ? true : (switchingToAuto ? false : asset.videoMetadata?.hasCustomThumbnail)
        }
      }),
    };

  } catch (err) {
    console.error("❌ Thumbnail selection failed:", {
      error: err.message,
      errorType: err.name,
      stack: err.stack
    });

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Thumbnail selection failed",
        error: err.message,
        errorType: err.name,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
