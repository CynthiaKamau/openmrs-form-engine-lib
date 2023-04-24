import { openmrsFetch, openmrsObservableFetch } from '@openmrs/esm-framework';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { encounterRepresentation } from '../constants';
import { MachineLearningResponse, OpenmrsForm } from './types';
import { isUuid } from '../utils/boolean-utils';

export function saveEncounter(abortController: AbortController, payload, encounterUuid?: string) {
  const url = !!encounterUuid ? `/ws/rest/v1/encounter/${encounterUuid}?v=full` : `/ws/rest/v1/encounter?v=full`;
  return openmrsFetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: payload,
    signal: abortController.signal,
  });
}

export function getConcept(conceptUuid: string, v: string): Observable<any> {
  return openmrsObservableFetch(`/ws/rest/v1/concept/${conceptUuid}?v=${v}`).pipe(map(response => response['data']));
}

export function getLocationsByTag(tag: string): Observable<{ uuid: string; display: string }[]> {
  return openmrsObservableFetch(`/ws/rest/v1/location?tag=${tag}&v=custom:(uuid,display)`).pipe(
    map(({ data }) => data['results']),
  );
}

export function getPreviousEncounter(patientUuid: string, encounterType) {
  const query = `encounterType=${encounterType}&patient=${patientUuid}`;
  return openmrsFetch(`/ws/rest/v1/encounter?${query}&limit=1&v=${encounterRepresentation}`).then(({ data }) => {
    return data.results.length ? data.results[0] : null;
  });
}

export function fetchConceptNameByUuid(conceptUuid: string) {
  return openmrsFetch(`/ws/rest/v1/concept/${conceptUuid}/name?limit=1`).then(({ data }) => {
    if (data.results.length) {
      const concept = data.results[data.results.length - 1];
      return concept.display;
    }
  });
}

export function getLatestObs(patientUuid: string, conceptUuid: string, encounterTypeUuid?: string) {
  let params = `patient=${patientUuid}&code=${conceptUuid}${
    encounterTypeUuid ? `&encounter.type=${encounterTypeUuid}` : ''
  }`;
  // the latest obs
  params += '&_sort=-_lastUpdated&_count=1';
  return openmrsFetch(`/ws/fhir2/R4/Observation?${params}`).then(({ data }) => {
    return data.entry?.length ? data.entry[0].resource : null;
  });
}

/**
 * Fetches an OpenMRS form using either its name or UUID.
 * @param {string} nameOrUUID - The form's name or UUID.
 * @returns {Promise<OpenmrsForm | null>} - A Promise that resolves to the fetched OpenMRS form or null if not found.
 */
export async function fetchOpenMRSForm(nameOrUUID: string): Promise<OpenmrsForm | null> {
  if (!nameOrUUID) {
    return null;
  }

  const { url, isUUID } = isUuid(nameOrUUID)
    ? { url: `/ws/rest/v1/form/${nameOrUUID}?v=full`, isUUID: true }
    : { url: `/ws/rest/v1/form?q=${nameOrUUID}&v=full`, isUUID: false };

  const { data: openmrsFormResponse } = await openmrsFetch(url);
  if (isUUID) {
    return openmrsFormResponse;
  }
  return openmrsFormResponse.results?.length
    ? openmrsFormResponse.results[0]
    : new Error(`Form with ${nameOrUUID} was not found`);
}

/**
 * Fetches ClobData for a given OpenMRS form.
 * @param {OpenmrsForm} form - The OpenMRS form object.
 * @returns {Promise<any | null>} - A Promise that resolves to the fetched ClobData or null if not found.
 */
export async function fetchClobData(form: OpenmrsForm): Promise<any | null> {
  if (!form) {
    return null;
  }

  const jsonSchemaResource = form.resources.find(({ name }) => name === 'JSON schema');
  if (!jsonSchemaResource) {
    return null;
  }

  const clobDataUrl = `/ws/rest/v1/clobdata/${jsonSchemaResource.valueReference}`;
  const { data: clobDataResponse } = await openmrsFetch(clobDataUrl);

  return clobDataResponse;
}

export async function getMLRiskScore(params: any): Promise<any | null> {
// export function getMLRiskScore(params: any) {
  console.log('hitting here', params);
  // console.log("age", params[0], "entryPoint", params[1], "everTested", params[2], "gender", params[3], "isDisabled", params[4], "latestMaritalStatus", params[5], "monthsSinceLastTest", params[6], "populationType", params[7], "selfTested", params[8], "tbScreening", params[9], "testStrategy", params[10])
  // if (params[0] == '' || params[4] == '' || params[1] == '' || params[10] == '' || params[9] == '') {
  //   return;
  // }

  let predictionVariables = {
    AgeAtTest: 0,
    MonthsSinceLastTest: params[6] > 0 ? params[6] : 0,
    GenderMale: params[3] == 'M' ? 1 : 0,
    GenderFemale: params[3] == 'F' ? 1 : 0,
    KeyPopulationTypeGP: 0,
    KeyPopulationTypeSW: 0,
    MaritalStatusMarried: 0,
    MaritalStatusDivorced: 0,
    MaritalStatusPolygamous: 0,
    MaritalStatusWidowed: 0,
    MaritalStatusSingle: 0,
    MaritalStatusMinor: 0,
    PatientDisabledNo: 0,
    PatientDisabledDisabled: 0,
    EverTestedForHIVYes: 0,
    EverTestedForHivNo: 0,
    ClientTestedAsIndividual: 0,
    ClientTestedAsCouple: 0,
    EntryPointVCT: 0,
    EntryPointOPD: 0,
    EntryPointMTC: 0,
    EntryPointIPD: 0,
    EntryPointMOBILE: 0,
    EntryPointOther: 0,
    EntryPointHB: 0,
    EntryPointPEDS: 0,
    EntryPointVMMC: 0,
    EntryPointTB: 0,
    EntryPointCCC: 0,
    EntryPointPNS: 0,
    TestingStrategyVCT: 0,
    TestingStrategyHB: 0,
    TestingStrategyMOBILE: 0,
    TestingStrategyHP: 0,
    TestingStrategyNP: 0,
    TBScreeningNoPresumedTB: 0,
    TBScreeningPresumedTB: 0,
    ClientSelfTestedNo: 0,
    ClientSelfTestedYes: 0,
  };

  // convert marital status
  if (params[5] == '5555AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // married monogamous
    predictionVariables.MaritalStatusMarried = 1;
  } else if (params[5] == '159715AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // married polygamous
    predictionVariables.MaritalStatusPolygamous = 1;
  } else if (params[5] == '1058AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // divorced
    predictionVariables.MaritalStatusDivorced = 1;
  } else if (params[5] == '1059AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // widowed
    predictionVariables.MaritalStatusWidowed = 1;
  } else if (params[5] == '1057AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.MaritalStatusSingle = 1;
  }

  if (params[0] < 15) {
    predictionVariables.MaritalStatusMinor = 1;
  }

  // convert population type
  if (params[7] == '164928AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.KeyPopulationTypeGP = 1;
  } else if (params[7] == '164929AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.KeyPopulationTypeSW = 1;
  }

  // convert disability status
  if (params[4] == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PatientDisabledNo = 1;
  } else if (params[4] == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.PatientDisabledDisabled = 1;
  }

  // convert ever tested for hiv status
  if (params[2] == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.EverTestedForHIVYes = 1;
  } else if (params[2] == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.EverTestedForHivNo = 1;
  }

  // converter for tested as i.e. individual, couple:
  if (params[2] == '164957AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ClientTestedAsIndividual = 1;
  } else if (params[2] == '164958AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ClientTestedAsCouple = 1;
  }

  // convert entry point

  if (params[1] == 159940) {
    // VCT
    predictionVariables.EntryPointVCT = 1;
  } else if (params[1] == '160542AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // OPD
    predictionVariables.EntryPointOPD = 1;
  } else if (params[1] == '160456AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // Maternity
    predictionVariables.EntryPointMTC = 1;
  } else if (params[1] == '5485AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // IPD
    predictionVariables.EntryPointIPD = 1;
  } else if (params[1] == '159939AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // mobile
    predictionVariables.EntryPointMOBILE = 1;
  } else if (params[1] == '159938AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // HB
    predictionVariables.EntryPointHB = 1;
  } else if (params[1] == '162181AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // Paed
    predictionVariables.EntryPointPEDS = 1;
  } else if (params[1] == '5622AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // Other
    predictionVariables.EntryPointOther = 1;
  } else if (params[1] == '162223AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // vmmc
    predictionVariables.EntryPointVMMC = 1;
  } else if (params[1] == '160541AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // tb
    predictionVariables.EntryPointTB = 1;
  }

  // convert strategy

  if (params[10] == '159938AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // HB
    predictionVariables.TestingStrategyHB = 1;
  } else if (params[10] == '159939AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // Mobile
    predictionVariables.TestingStrategyMOBILE = 1;
  } else if (params[10] == '164163AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // HP
    predictionVariables.TestingStrategyHP = 1;
  } else if (params[10] == '164953AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    // NP
    predictionVariables.TestingStrategyNP = 1;
  } else if (
    params[10] == '164954AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ||
    params[10] == '164955AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  ) {
    // VCT
    predictionVariables.TestingStrategyVCT = 1;
  }

  // convert HIV self test
  if (params[8] == '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ClientSelfTestedNo = 1;
  } else if (params[8] == '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.ClientSelfTestedYes = 1;
  }

  // convert TB screening
  if (params[9] == '1660AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' || params[9] == '160737AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') {
    predictionVariables.TBScreeningNoPresumedTB = 1;
  } else if (
    params[9] == '142177AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ||
    params[9] == '1111AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
  ) {
    predictionVariables.TBScreeningPresumedTB = 1;
  }

  const mlFormattedDate = new Date().toISOString().slice(0, 10); //YYYY-MM-DD
  const modelConfigs = {
    modelId: 'hts_xgb_1211_jan_2023',
    encounterDate: mlFormattedDate,
    facilityId: '',
    debug: 'true',
  };
  // var mlScoringRequestPayload = {
  //   modelConfigs: modelConfigs,
  //   variableValues: predictionVariables
  // }

  var mlScoringRequestPayload = {
    modelConfigs: { modelId: 'hts_xgb_1211_jan_2023', encounterDate: '2023-03-15', facilityId: '', debug: 'true' },
    variableValues: {
      Age: 17,
      births: 0,
      pregnancies: 0,
      literacy: 0,
      poverty: 0,
      anc: 0,
      pnc: 0,
      sba: 0,
      hiv_prev: 0,
      hiv_count: 0,
      condom: 0,
      intercourse: 0,
      in_union: 0,
      circumcision: 0,
      partner_away: 0,
      partner_men: 0,
      partner_women: 0,
      sti: 0,
      fb: 0,
      PopulationTypeGP: 1,
      PopulationTypeKP: 0,
      PopulationTypePRIORITY: 0,
      KeyPopulationFSW: 0,
      KeyPopulationMSM: 0,
      KeyPopulationNR: 1,
      KeyPopulationOther: 0,
      KeyPopulationPWID: 0,
      PriorityPopulationAGYW: 0,
      PriorityPopulationFISHERMEN: 0,
      PriorityPopulationNR: 1,
      PriorityPopulationOTHER: 0,
      DepartmentEMERGENCY: 0,
      DepartmentIPD: 1,
      DepartmentOPD: 0,
      DepartmentPMTCT: 0,
      DepartmentVCT: 0,
      IsHealthWorkerNO: 0,
      IsHealthWorkerNR: 1,
      IsHealthWorkerYES: 0,
      SexuallyActiveNO: 0,
      SexuallyActiveNR: 1,
      SexuallyActiveYES: 0,
      NewPartnerNO: 0,
      NewPartnerNR: 1,
      NewPartnerYES: 0,
      PartnerHIVStatusNEGATIVE: 0,
      PartnerHIVStatusNR: 1,
      PartnerHIVStatusPOSITIVE: 0,
      PartnerHIVStatusUNKNOWN: 0,
      NumberOfPartnersMULTIPLE: 0,
      NumberOfPartnersNR: 1,
      NumberOfPartnersSINGLE: 0,
      AlcoholSexALWAYS: 0,
      AlcoholSexNEVER: 0,
      AlcoholSexNR: 1,
      AlcoholSexSOMETIMES: 0,
      MoneySexNO: 0,
      MoneySexNR: 1,
      MoneySexYES: 0,
      CondomBurstNO: 0,
      CondomBurstNR: 1,
      CondomBurstYES: 0,
      UnknownStatusPartnerNO: 0,
      UnknownStatusPartnerNR: 1,
      UnknownStatusPartnerYES: 0,
      KnownStatusPartnerNO: 0,
      KnownStatusPartnerNR: 1,
      KnownStatusPartnerYES: 0,
      PregnantNO: 0,
      PregnantNR: 1,
      PregnantYES: 0,
      BreastfeedingMotherNO: 0,
      BreastfeedingMotherNR: 1,
      BreastfeedingMotherYES: 0,
      ExperiencedGBVNO: 0,
      ExperiencedGBVYES: 0,
      CurrentlyOnPrepNO: 0,
      CurrentlyOnPrepNR: 0,
      CurrentlyOnPrepYES: 0,
      CurrentlyHasSTINO: 0,
      CurrentlyHasSTINR: 0,
      CurrentlyHasSTIYES: 0,
      SharedNeedleNO: 0,
      SharedNeedleNR: 1,
      SharedNeedleYES: 0,
      NeedleStickInjuriesNO: 0,
      NeedleStickInjuriesNR: 1,
      NeedleStickInjuriesYES: 0,
      TraditionalProceduresNO: 0,
      TraditionalProceduresNR: 1,
      TraditionalProceduresYES: 0,
      MothersStatusNEGATIVE: 0,
      MothersStatusNR: 1,
      MothersStatusPOSITIVE: 0,
      MothersStatusUNKNOWN: 0,
      ReferredForTestingNO: 0,
      ReferredForTestingYES: 0,
      GenderFEMALE: 1,
      GenderMALE: 0,
      MaritalStatusDIVORCED: 0,
      MaritalStatusMARRIED: 0,
      MaritalStatusMINOR: 0,
      MaritalStatusPOLYGAMOUS: 1,
      MaritalStatusSINGLE: 0,
      EverTestedForHivNO: 0,
      EverTestedForHivYES: 1,
      MonthsSinceLastTestLASTSIXMONTHS: 0,
      MonthsSinceLastTestMORETHANTWOYEARS: 1,
      MonthsSinceLastTestNR: 0,
      MonthsSinceLastTestONETOTWOYEARS: 0,
      MonthsSinceLastTestSEVENTOTWELVE: 0,
      ClientTestedAsCOUPLE: 0,
      ClientTestedAsINDIVIDUAL: 0,
      EntryPointIPD: 0,
      EntryPointOPD: 0,
      EntryPointOTHER: 0,
      EntryPointPEDIATRIC: 0,
      EntryPointPMTCT_ANC: 0,
      EntryPointPMTCT_MAT_PNC: 0,
      EntryPointTB: 0,
      EntryPointVCT: 1,
      EntryPointVMMC: 0,
      TestStrategyHB: 0,
      TestStrategyHP: 0,
      TestStrategyINDEX: 0,
      TestStrategyMO: 0,
      TestStrategyNP: 0,
      TestStrategyOTHER: 0,
      TestStrategySNS: 0,
      TestStrategyVI: 0,
      TestStrategyVS: 1,
      TbScreeningCONFIRMEDTB: 0,
      TbScreeningNOPRESUMEDTB: 0,
      TbScreeningPRESUMEDTB: 0,
      ClientSelfTestedNO: 1,
      ClientSelfTestedYES: 0,
      CoupleDiscordantNO: 0,
      CoupleDiscordantNR: 1,
      CoupleDiscordantYES: 0,
      SEXUALNO: 0,
      SEXUALYES: 1,
      SOCIALNO: 1,
      SOCIALYES: 0,
      NONENO: 1,
      NONEYES: 0,
      NEEDLE_SHARINGNO: 1,
      NEEDLE_SHARINGYES: 0,
      ReceivedPrEPNO: 1,
      ReceivedPrEPYES: 0,
      ReceivedPEPNO: 1,
      ReceivedPEPYES: 0,
      ReceivedTBNO: 1,
      ReceivedTBYES: 0,
      ReceivedSTINO: 1,
      ReceivedSTIYES: 0,
      GBVSexualNO: 1,
      GBVSexualYES: 0,
      GBVPhysicalNO: 1,
      GBVPhysicalYES: 0,
      GBVEmotionalNO: 1,
      GBVEmotionalYES: 0,
      dayofweekFRIDAY: 0,
      dayofweekMONDAY: 0,
      dayofweekSATURDAY: 0,
      dayofweekSUNDAY: 0,
      dayofweekTHURSDAY: 0,
      dayofweekTUESDAY: 0,
      dayofweekWEDNESDAY: 1,
    },
  };

  const url = 'http://197.248.44.228:8600/openmrs/ws/rest/v1/keml/casefindingscore';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(mlScoringRequestPayload),
  });

  // console.log("---res", response.then((response) => {
  //   console.log("---haha", response.json())
  // }).then((error) => console.log("---error", error)))

  return response.json().then(result => {
    if (result?.result?.predictions) {
      console.log("---y", result?.result?.predictions)
      const lowRiskThreshold = 0.002625179;
      const mediumRiskThreshold = 0.010638781;
      const highRiskThreshold = 0.028924102;
      if (result?.result?.predictions['probability(1)'] > highRiskThreshold) {
        return 'Client has a very high probability of a HIV positive test result. Testing is strongly recommended';
      }
      if (
        result?.result?.predictions['probability(1)'] < highRiskThreshold &&
        result.result.predictions['probability(1)'] > mediumRiskThreshold
      ) {
        return 'Client has a high probability of a HIV positive test result. Testing is strongly recommended';
      }
      if (result?.result?.predictions['probability(1)'] > lowRiskThreshold) {
        return 'Client has a medium probability of a HIV positive test result. Testing is recommended';
      }
      if (result?.result?.predictions['probability(1)'] <= lowRiskThreshold) {
        return 'Client has a low probability of a HIV positive test result. Testing may not be recommended';
      } else {
        return `No results found`;
      }
    } else {
      return `No results found`;
    }
  });
}
