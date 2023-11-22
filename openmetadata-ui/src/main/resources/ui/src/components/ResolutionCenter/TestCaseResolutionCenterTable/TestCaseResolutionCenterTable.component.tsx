/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Col, Row, Space, Tooltip } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { sortBy } from 'lodash';
import QueryString from 'qs';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  getTableTabPath,
  NO_DATA_PLACEHOLDER,
} from '../../../constants/constants';
import { Operation } from '../../../generated/entity/policies/policy';
import { EntityReference } from '../../../generated/entity/type';
import {
  TestCase,
  TestCaseResult,
  TestCaseStatus,
} from '../../../generated/tests/testCase';
import { getNameFromFQN } from '../../../utils/CommonUtils';
import {
  formatDate,
  formatDateTime,
} from '../../../utils/date-time/DateTimeUtils';
import { getEntityName } from '../../../utils/EntityUtils';
import { checkPermission } from '../../../utils/PermissionsUtils';
import { getResolutionCenterDetailPagePath } from '../../../utils/RouterUtils';
import { getEncodedFqn, replacePlus } from '../../../utils/StringsUtils';
import { getEntityFqnFromEntityLink } from '../../../utils/TableUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import AppBadge from '../../common/Badge/Badge.component';
import FilterTablePlaceHolder from '../../common/ErrorWithPlaceholder/FilterTablePlaceHolder';
import { StatusBox } from '../../common/LastRunGraph/LastRunGraph.component';
import NextPrevious from '../../common/NextPrevious/NextPrevious';
import { OwnerLabel } from '../../common/OwnerLabel/OwnerLabel.component';
import Table from '../../common/Table/Table';
import { usePermissionProvider } from '../../PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../PermissionProvider/PermissionProvider.interface';
import { TableProfilerTab } from '../../ProfilerDashboard/profilerDashboard.interface';
import '../resolution-center.style.less';
import Severity from '../Severity/Severity.component';
import { TestCaseResolutionCenterTableProps } from './TestCaseResolutionCenterTable.interface';

const TestCaseResolutionCenterTable = ({
  testCaseListData,
  pagingData,
  showPagination,
}: TestCaseResolutionCenterTableProps) => {
  const { t } = useTranslation();
  const { permissions } = usePermissionProvider();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const testCaseEditPermission = useMemo(() => {
    return checkPermission(
      Operation.EditAll,
      ResourceEntity.TEST_CASE,
      permissions
    );
  }, [permissions]);

  const sortedData = useMemo(
    () =>
      sortBy(testCaseListData.data, (test) => {
        switch (test.testCaseResult?.testCaseStatus) {
          case TestCaseStatus.Failed:
            return 0;
          case TestCaseStatus.Aborted:
            return 1;
          case TestCaseStatus.Success:
            return 2;

          default:
            return 3;
        }
      }),
    [testCaseListData.data]
  );

  const handleSeveritySave = (
    values: { severity: string },
    record: TestCase
  ) => {
    setIsLoading(true);
    try {
      // onSave(values.severity);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const columns: ColumnsType<TestCase> = useMemo(
    () => [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        width: 300,
        fixed: 'left',
        render: (_, record) => {
          const status = record.testCaseResult?.testCaseStatus;

          return (
            <Space data-testid={record.name}>
              <Tooltip title={status}>
                <div>
                  <StatusBox status={status?.toLocaleLowerCase()} />
                </div>
              </Tooltip>

              <Link
                className="m-0 break-all text-primary"
                data-testid={`test-case-${record.name}`}
                style={{ maxWidth: 280 }}
                to={getResolutionCenterDetailPagePath(
                  record.fullyQualifiedName ?? ''
                )}>
                {getEntityName(record)}
              </Link>
            </Space>
          );
        },
      },
      {
        title: t('label.table'),
        dataIndex: 'entityLink',
        key: 'table',
        width: 150,
        render: (entityLink: string) => {
          const tableFqn = getEntityFqnFromEntityLink(entityLink);
          const name = getNameFromFQN(tableFqn);

          return (
            <Link
              data-testid="table-link"
              to={{
                pathname: getTableTabPath(getEncodedFqn(tableFqn), 'profiler'),
                search: QueryString.stringify({
                  activeTab: TableProfilerTab.DATA_QUALITY,
                }),
              }}
              onClick={(e) => e.stopPropagation()}>
              {name}
            </Link>
          );
        },
      },
      {
        title: t('label.test-suite'),
        dataIndex: 'testSuite',
        key: 'testSuite',
        width: 300,
        render: (testSuite: EntityReference) =>
          getEntityName(testSuite) || NO_DATA_PLACEHOLDER,
      },
      {
        title: t('label.column'),
        dataIndex: 'entityLink',
        key: 'column',
        width: 150,
        render: (entityLink: string) => {
          const isColumn = entityLink.includes('::columns::');
          if (isColumn) {
            const name = getNameFromFQN(
              replacePlus(getEntityFqnFromEntityLink(entityLink, isColumn))
            );

            return name;
          }

          return '--';
        },
      },
      {
        title: t('label.execution-time'),
        dataIndex: 'executionTime',
        key: 'executionTime',
        width: 150,
        render: (result: TestCaseResult) =>
          result?.timestamp ? formatDateTime(result.timestamp) : '--',
      },
      {
        title: t('label.status'),
        dataIndex: 'testCaseResult',
        key: 'resolution',
        width: 100,
        render: (value: TestCaseResult) => {
          const label = value?.testCaseFailureStatus?.testCaseFailureStatusType;
          const failureStatus = value?.testCaseFailureStatus;

          return label ? (
            <Tooltip
              placement="bottom"
              title={
                failureStatus?.updatedAt &&
                `${formatDate(failureStatus.updatedAt)}
                        ${
                          failureStatus.updatedBy
                            ? 'by ' + failureStatus.updatedBy
                            : ''
                        }`
              }>
              <div>
                <AppBadge
                  className={classNames(
                    'resolution',
                    label.toLocaleLowerCase()
                  )}
                  label={label}
                />
              </div>
            </Tooltip>
          ) : (
            '--'
          );
        },
      },
      {
        title: t('label.severity'),
        dataIndex: 'severity',
        key: 'severity',
        width: 150,
        render: (severity: string, record) => (
          <Severity
            isLoading={isLoading}
            severity={severity}
            onSave={(severity) => handleSeveritySave(severity, record)}
          />
        ),
      },
      {
        title: t('label.assignee'),
        dataIndex: 'assignee',
        key: 'assignee',
        width: 150,
        render: (assignee: EntityReference) => <OwnerLabel owner={assignee} />,
      },
      {
        title: t('label.reviewer'),
        dataIndex: 'reviewer',
        key: 'reviewer',
        render: (owner: EntityReference) => <OwnerLabel owner={owner} />,
      },
    ],
    [testCaseEditPermission, testCaseListData.data]
  );

  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Table
          bordered
          className="test-case-table-container"
          columns={columns}
          data-testid="test-case-resolution-table"
          dataSource={sortedData}
          loading={testCaseListData.isLoading}
          locale={{
            emptyText: <FilterTablePlaceHolder />,
          }}
          pagination={false}
          rowKey="id"
          scroll={{ x: 1600 }}
          size="small"
        />
      </Col>
      <Col span={24}>
        {pagingData && showPagination && <NextPrevious {...pagingData} />}
      </Col>
      <Col />
    </Row>
  );
};

export default TestCaseResolutionCenterTable;
