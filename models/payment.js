'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Tuition)
    }
  };
  Payment.init({
    time: DataTypes.STRING,
    amount: DataTypes.INTEGER,
    isPaid: DataTypes.BOOLEAN,
    TuitionId: DataTypes.INTEGER,
    currentPeriod: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Payment',
  });
  return Payment;
};