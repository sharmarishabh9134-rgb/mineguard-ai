import mongoose from 'mongoose';
import MineSiteRisk from '../models/MineSiteRisk.js';

const MEMORY_RISK_MAP = {};

export const recalculateMineRisk = async (req, res) => {
  try {
    const { zoneId, rainfallMm = 0, openViolationsCount = 0 } = req.body;

    if (!zoneId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid zoneId.'
      });
    }

    const { fetchWeatherForMine } = await import('../services/weatherService.js');
    
    // Attempt to get live weather data for risk index
    let rain = parseFloat(rainfallMm) || 0;
    let wind = 0;
    try {
      const weather = await fetchWeatherForMine(23.7512, 86.4215);
      if (weather && weather.data && weather.data.current) {
         rain = weather.data.current.precipitation || rain;
         wind = weather.data.current.wind_speed_10m || wind;
      }
    } catch (e) {
      console.warn('Weather fetch failed in risk calc, using default/inputs');
    }

    const violations = parseInt(openViolationsCount, 10) || 0;

    // Do not make weather the ONLY factor determining risk
    const calculatedRiskScore = Math.min(100, Math.max(0, Math.round((rain * 0.4) + (wind * 0.2) + (violations * 10))));

    let riskLevel = 'LOW';
    if (calculatedRiskScore > 70) {
      riskLevel = 'HIGH';
    } else if (calculatedRiskScore >= 30) {
      riskLevel = 'MEDIUM';
    }

    let updatedRisk = null;

    if (mongoose.connection.readyState === 1) {
      updatedRisk = await MineSiteRisk.findOneAndUpdate(
        { zoneId },
        {
          zoneId,
          rainfallMm: rain,
          openViolationsCount: violations,
          calculatedRiskScore,
          updatedAt: new Date()
        },
        { new: true, upsert: true, runValidators: true }
      );
    } else {
      updatedRisk = {
        _id: `mem-risk-${zoneId}`,
        zoneId,
        rainfallMm: rain,
        openViolationsCount: violations,
        calculatedRiskScore,
        updatedAt: new Date()
      };
      MEMORY_RISK_MAP[zoneId] = updatedRisk;
    }

    return res.status(200).json({
      success: true,
      message: 'Mine risk recalculated and saved successfully.',
      riskLevel,
      data: updatedRisk
    });
  } catch (error) {
    console.error('Error in recalculateMineRisk:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to recalculate mine risk.',
      error: error.message
    });
  }
};
